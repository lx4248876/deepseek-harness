/** `handoff` namespace dictionaries. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'button.label': '交接',
  'button.aria': '生成交接包并在新会话继续，然后归档当前会话',
  'button.pending': '生成中',
  // The skill gesture `/handoff` must be followed by whitespace or the end of
  // the message (dsh-tool-skill's word-boundary grammar), so it stays last.
  'prompt': '请为当前任务执行 handoff 技能并生成交接包：/handoff',
  'error.skillMissing': '未找到 handoff 技能，请先安装到技能目录。',
  'error.noPackage': '未能生成交接包，未归档当前会话。',
  'error.failed': '交接失败，未归档当前会话。',
} satisfies Record<string, string>

/** The handoff namespace key union. */
export type HandoffKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'button.label': 'Handoff',
  'button.aria': 'Generate a handoff package, continue it in a new conversation, and archive this session',
  'button.pending': 'Generating',
  // The skill gesture `/handoff` must be followed by whitespace or the end of
  // the message (dsh-tool-skill's word-boundary grammar), so it stays last.
  'prompt': 'Run the handoff skill for the current task and generate the handoff package: /handoff',
  'error.skillMissing': 'The handoff skill is not available; install it in your skills directory.',
  'error.noPackage': 'No handoff package was produced; the session was not archived.',
  'error.failed': 'Handoff failed; the session was not archived.',
} satisfies Record<HandoffKey, string>
