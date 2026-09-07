import { PROMPT_VERSION } from "@/lib/editorial-policy";
import {
  IM_NOT_AI_UPSTREAM_SOURCE,
} from "@/lib/im-not-ai-upstream-policy";

export const ACTIVE_PROMPT_VERSION =
  `${PROMPT_VERSION}+im-${IM_NOT_AI_UPSTREAM_SOURCE.version}-${IM_NOT_AI_UPSTREAM_SOURCE.commit.slice(0, 7)}`;
