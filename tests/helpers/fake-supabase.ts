import { computeChapaPeriodEnd } from "@/lib/payments/access-rules";

type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

/**
 * Minimal in-memory stand-in for the service-role Supabase client — only the
 * query shapes used by the Chapa fulfil/webhook paths. `rpc("grant_chapa_entitlement")`
 * reproduces migration 033's state machine: pending/failed/canceled → success once,
 * then GREATEST(now, active end) + period_days.
 */
export class FakeDb {
  tables: Record<string, Row[]> = { payments: [], subscriptions: [], processed_webhook_events: [] };
  rpcCalls = 0;
  private seq = 0;

  constructor(public nowMs: () => number = () => Date.now()) {}

  nextId(): string {
    this.seq += 1;
    return `00000000-0000-4000-8000-${String(this.seq).padStart(12, "0")}`;
  }

  from(table: string) {
    return new FakeQuery(this, table);
  }

  async rpc(name: string, args: Record<string, unknown>) {
    if (name !== "grant_chapa_entitlement") return { data: null, error: { message: `unknown rpc ${name}` } };
    this.rpcCalls += 1;
    const payment = this.tables.payments.find((p) => p.id === args.p_payment_id);
    if (!payment || !["pending", "failed", "canceled"].includes(String(payment.status))) {
      return { data: [{ granted: false, period_end: null }], error: null };
    }
    payment.status = "success";
    payment.provider_payment_id = args.p_provider_payment_id ?? payment.provider_payment_id;

    const subs = this.tables.subscriptions;
    let sub = subs.find((s) => s.user_id === payment.user_id && s.provider === "chapa");
    const end = computeChapaPeriodEnd({
      currentStatus: (sub?.status as string) ?? null,
      currentPeriodEnd: (sub?.current_period_end as string) ?? null,
      periodDays: Number(payment.period_days),
      nowMs: this.nowMs(),
    }).toISOString();
    if (!sub) {
      sub = { id: this.nextId(), user_id: payment.user_id, provider: "chapa" };
      subs.push(sub);
    }
    Object.assign(sub, { status: "active", plan: payment.plan, current_period_end: end, chapa_tx_ref: payment.provider_tx_ref });
    return { data: [{ granted: true, period_end: end }], error: null };
  }
}

class FakeQuery implements PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }> {
  private op: "select" | "insert" | "update" = "select";
  private payload: Row | null = null;
  private filters: Filter[] = [];
  private single = false;

  constructor(private db: FakeDb, private table: string) {}

  select() {
    return this;
  }
  insert(row: Row) {
    this.op = "insert";
    this.payload = row;
    return this;
  }
  update(patch: Row) {
    this.op = "update";
    this.payload = patch;
    return this;
  }
  eq(col: string, value: unknown) {
    this.filters.push((r) => r[col] === value);
    return this;
  }
  in(col: string, values: unknown[]) {
    this.filters.push((r) => values.includes(r[col]));
    return this;
  }
  maybeSingle() {
    this.single = true;
    return this;
  }

  private rows(): Row[] {
    const all = this.db.tables[this.table] ?? (this.db.tables[this.table] = []);
    return all.filter((r) => this.filters.every((f) => f(r)));
  }

  private async exec() {
    if (this.op === "insert") {
      const row: Row = { id: this.db.nextId(), ...this.payload };
      if (this.table === "processed_webhook_events") {
        const dup = this.db.tables.processed_webhook_events.some(
          (r) => r.provider === row.provider && r.event_id === row.event_id
        );
        if (dup) return { data: null, error: { message: "duplicate key", code: "23505" } };
      }
      this.db.tables[this.table].push(row);
      return { data: row, error: null };
    }
    if (this.op === "update") {
      const rows = this.rows();
      rows.forEach((r) => Object.assign(r, this.payload));
      return { data: rows, error: null };
    }
    const rows = this.rows().map((r) => ({ ...r }));
    return { data: this.single ? rows[0] ?? null : rows, error: null };
  }

  then<T1 = { data: unknown; error: { message: string; code?: string } | null }, T2 = never>(
    onfulfilled?: ((value: { data: unknown; error: { message: string; code?: string } | null }) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null
  ): PromiseLike<T1 | T2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}
