export type ConversationMonitorRow = {
  id: string;
  user_id: string;
  unlocked_through_episode: number;
  memory_summary: string | null;
  updated_at: string;
  created_at: string;
  message_count: number;
};

/** Read-only conversation list for admin monitoring. */
export function CharacterConversationsPanel({
  rows,
}: {
  rows: ConversationMonitorRow[];
}) {
  return (
    <div className="rw-admin-panel space-y-3">
      <div>
        <h2 className="font-display text-lg uppercase tracking-wide text-white">
          Conversations
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Read-only monitoring — {rows.length} conversation
          {rows.length === 1 ? "" : "s"}.
        </p>
      </div>

      {!rows.length ? (
        <p className="text-sm text-zinc-500">No chats yet for this character.</p>
      ) : (
        <div className="rw-admin-table-wrap">
          <table className="rw-admin-table">
            <thead>
              <tr>
                <th>Updated</th>
                <th>User</th>
                <th>Unlocked ep</th>
                <th>Messages</th>
                <th>Memory</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap text-zinc-400">
                    {new Date(row.updated_at).toLocaleString()}
                  </td>
                  <td className="font-mono text-xs text-zinc-500">
                    {row.user_id.slice(0, 8)}…
                  </td>
                  <td className="text-zinc-300">{row.unlocked_through_episode}</td>
                  <td className="text-zinc-300">{row.message_count}</td>
                  <td className="max-w-xs truncate text-zinc-500">
                    {row.memory_summary?.trim() || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
