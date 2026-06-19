import {
  PRODUCTION_STATUSES,
  PROJECT_STAGES,
  PROJECT_TYPES,
  SUBMISSION_GENRES,
  type ProductionStatus,
  type ProjectStage,
  type ProjectType,
  type SubmissionGenre,
} from "@/lib/submissions/constants";
import { isFilmProject, isSeriesProject, LOGLINE_MAX_LENGTH } from "@/lib/submissions/project-type";
import {
  CUSTOM_GENRE_MAX_LENGTH,
  isOtherSubmissionGenre,
} from "@/lib/submissions/genre";

export type CreatorSubmissionInput = {
  creatorName: string;
  email: string;
  phone: string;
  company: string;
  country: string;
  instagram: string;
  website: string;
  imdb: string;
  projectTitle: string;
  projectType: string;
  genre: string;
  customGenre: string;
  logline: string;
  description: string;
  episodeCount: string;
  averageEpisodeLength: string;
  runtimeMinutes: string;
  productionStatus: string;
  projectStage: string;
  targetAudience: string;
  trailerAvailable: string;
  trailerLink: string;
  screenerLink: string;
  youtubeLink: string;
  vimeoLink: string;
  googleDriveLink: string;
  dropboxLink: string;
  projectWebsiteLink: string;
  posterLink: string;
  heroBannerLink: string;
  ownsDistributionRights: string;
  releasedElsewhere: string;
  releasedElsewhereWhere: string;
  rightsConfirmed: string;
  additionalNotes: string;
};

export const DESCRIPTION_MIN_WORDS = 10;
export const DESCRIPTION_MAX_WORDS = 300;

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function parseBoolean(value: string, fieldLabel: string): boolean | string {
  if (value === "yes") return true;
  if (value === "no") return false;
  return `${fieldLabel} is required.`;
}

function optionalUrl(
  value: string,
  fieldLabel: string
): { value: string | null; error?: string } {
  const trimmed = value.trim();
  if (!trimmed) return { value: null };
  try {
    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol)) {
      return { value: null, error: `${fieldLabel} must be a valid URL.` };
    }
    return { value: trimmed };
  } catch {
    return { value: null, error: `${fieldLabel} must be a valid URL.` };
  }
}

export function validateCreatorSubmission(
  input: CreatorSubmissionInput
): { ok: true; data: CreatorSubmissionRecord } | { ok: false; error: string } {
  const creatorName = input.creatorName.trim();
  const email = input.email.trim().toLowerCase();
  const projectTitle = input.projectTitle.trim();
  const projectType = input.projectType.trim() as ProjectType;
  const logline = input.logline.trim();
  const description = input.description.trim();
  const genre = input.genre.trim() as SubmissionGenre;
  const productionStatus = input.productionStatus.trim() as ProductionStatus;
  const projectStage = input.projectStage.trim() as ProjectStage;

  if (!creatorName) return { ok: false, error: "Full name is required." };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "A valid email address is required." };
  }
  if (!projectTitle) return { ok: false, error: "Project title is required." };
  if (!PROJECT_TYPES.includes(projectType)) {
    return { ok: false, error: "Please select a project type." };
  }
  if (!SUBMISSION_GENRES.includes(genre)) {
    return { ok: false, error: "Please select a genre." };
  }

  let customGenre: string | null = null;
  if (isOtherSubmissionGenre(genre)) {
    const trimmedCustomGenre = input.customGenre.trim();
    if (!trimmedCustomGenre) {
      return { ok: false, error: "Custom genre is required when Other is selected." };
    }
    if (trimmedCustomGenre.length > CUSTOM_GENRE_MAX_LENGTH) {
      return {
        ok: false,
        error: `Custom genre must be ${CUSTOM_GENRE_MAX_LENGTH} characters or fewer.`,
      };
    }
    customGenre = trimmedCustomGenre;
  }

  if (!logline) return { ok: false, error: "Logline is required." };
  if (logline.length > LOGLINE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Logline must be ${LOGLINE_MAX_LENGTH} characters or fewer.`,
    };
  }
  if (!description) return { ok: false, error: "Description is required." };

  const words = wordCount(description);
  if (words < DESCRIPTION_MIN_WORDS) {
    return {
      ok: false,
      error: `Description must be at least ${DESCRIPTION_MIN_WORDS} words.`,
    };
  }
  if (words > DESCRIPTION_MAX_WORDS) {
    return {
      ok: false,
      error: `Description must be ${DESCRIPTION_MAX_WORDS} words or fewer.`,
    };
  }

  const episodeCountRaw = input.episodeCount.trim();
  const averageEpisodeLengthRaw = input.averageEpisodeLength.trim();
  const runtimeMinutesRaw = input.runtimeMinutes.trim();
  const seriesProject = isSeriesProject(projectType);
  const filmProject = isFilmProject(projectType);

  let episodeCount: number;
  let averageEpisodeLength: string;
  let runtimeMinutes: number | null;

  if (seriesProject) {
    episodeCount = Number.parseInt(episodeCountRaw, 10);
    if (!Number.isFinite(episodeCount) || episodeCount < 1) {
      return { ok: false, error: "Number of episodes must be at least 1." };
    }
    averageEpisodeLength = averageEpisodeLengthRaw;
    if (!averageEpisodeLength) {
      return { ok: false, error: "Average episode length is required." };
    }
    runtimeMinutes = null;
  } else if (filmProject) {
    const parsedRuntime = Number.parseInt(runtimeMinutesRaw, 10);
    if (
      !runtimeMinutesRaw ||
      !/^\d+$/.test(runtimeMinutesRaw) ||
      !Number.isFinite(parsedRuntime) ||
      parsedRuntime <= 0
    ) {
      return { ok: false, error: "Runtime must be a whole number greater than 0." };
    }
    runtimeMinutes = parsedRuntime;
    episodeCount = 1;
    averageEpisodeLength = "N/A";
  } else {
    return { ok: false, error: "Please select a project type." };
  }

  if (!PRODUCTION_STATUSES.some((s) => s.value === productionStatus)) {
    return { ok: false, error: "Please select a production status." };
  }

  if (!PROJECT_STAGES.some((s) => s.value === projectStage)) {
    return { ok: false, error: "Please select a project stage." };
  }

  const trailerAvailable = parseBoolean(input.trailerAvailable, "Trailer availability");
  if (typeof trailerAvailable === "string") {
    return { ok: false, error: trailerAvailable };
  }

  let trailerLink: string | null = null;
  if (trailerAvailable) {
    const trailerCheck = optionalUrl(input.trailerLink, "Trailer link");
    if (trailerCheck.error) return { ok: false, error: trailerCheck.error };
    if (!trailerCheck.value) {
      return { ok: false, error: "Trailer link is required when a trailer is available." };
    }
    trailerLink = trailerCheck.value;
  }

  if (input.rightsConfirmed !== "yes") {
    return {
      ok: false,
      error: "You must confirm that you own or control the rights to submit this project.",
    };
  }

  const ownsDistributionRights = parseBoolean(
    input.ownsDistributionRights,
    "Distribution rights"
  );
  if (typeof ownsDistributionRights === "string") {
    return { ok: false, error: ownsDistributionRights };
  }

  const releasedElsewhere = parseBoolean(
    input.releasedElsewhere,
    "Release status"
  );
  if (typeof releasedElsewhere === "string") {
    return { ok: false, error: releasedElsewhere };
  }

  const releasedElsewhereWhere = optionalText(input.releasedElsewhereWhere);
  if (releasedElsewhere && !releasedElsewhereWhere) {
    return {
      ok: false,
      error: "Please tell us where this project has been released.",
    };
  }

  const urlChecks = [
    optionalUrl(input.website, "Website"),
    optionalUrl(input.imdb, "IMDb"),
    optionalUrl(input.screenerLink, "Private screener link"),
    optionalUrl(input.youtubeLink, "YouTube link"),
    optionalUrl(input.vimeoLink, "Vimeo link"),
    optionalUrl(input.googleDriveLink, "Google Drive link"),
    optionalUrl(input.dropboxLink, "Dropbox link"),
    optionalUrl(input.projectWebsiteLink, "Website link"),
    optionalUrl(input.posterLink, "Poster link"),
    optionalUrl(input.heroBannerLink, "Hero banner link"),
  ];

  for (const check of urlChecks) {
    if (check.error) return { ok: false, error: check.error };
  }

  const [
    website,
    imdb,
    screenerLink,
    youtubeLink,
    vimeoLink,
    googleDriveLink,
    dropboxLink,
    projectWebsiteLink,
    posterLink,
    heroBannerLink,
  ] = urlChecks.map((c) => c.value);

  return {
    ok: true,
    data: {
      creator_name: creatorName,
      email,
      phone: optionalText(input.phone),
      company: optionalText(input.company),
      country: optionalText(input.country),
      instagram: optionalText(input.instagram),
      website,
      imdb,
      project_title: projectTitle,
      project_type: projectType,
      genre,
      custom_genre: customGenre,
      logline,
      description,
      episode_count: episodeCount,
      average_episode_length: averageEpisodeLength,
      runtime_minutes: runtimeMinutes,
      production_status: productionStatus,
      project_stage: projectStage,
      target_audience: optionalText(input.targetAudience),
      trailer_available: trailerAvailable,
      submission_rights_confirmed: true,
      trailer_link: trailerLink,
      screener_link: screenerLink,
      youtube_link: youtubeLink,
      vimeo_link: vimeoLink,
      google_drive_link: googleDriveLink,
      dropbox_link: dropboxLink,
      project_website_link: projectWebsiteLink,
      poster_link: posterLink,
      hero_banner_link: heroBannerLink,
      owns_distribution_rights: ownsDistributionRights,
      released_elsewhere: releasedElsewhere,
      released_elsewhere_where: releasedElsewhereWhere,
      additional_notes: optionalText(input.additionalNotes),
    },
  };
}

export type CreatorSubmissionRecord = {
  creator_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  country: string | null;
  instagram: string | null;
  website: string | null;
  imdb: string | null;
  project_title: string;
  project_type: ProjectType;
  genre: string;
  custom_genre: string | null;
  logline: string;
  description: string;
  episode_count: number;
  average_episode_length: string;
  runtime_minutes: number | null;
  production_status: ProductionStatus;
  project_stage: ProjectStage;
  target_audience: string | null;
  trailer_available: boolean;
  submission_rights_confirmed: boolean;
  trailer_link: string | null;
  screener_link: string | null;
  youtube_link: string | null;
  vimeo_link: string | null;
  google_drive_link: string | null;
  dropbox_link: string | null;
  project_website_link: string | null;
  poster_link: string | null;
  hero_banner_link: string | null;
  owns_distribution_rights: boolean;
  released_elsewhere: boolean;
  released_elsewhere_where: string | null;
  additional_notes: string | null;
};
