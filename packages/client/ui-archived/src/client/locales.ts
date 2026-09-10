/** `archived` namespace dictionaries. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'panel.title': '已归档会话',
  'panel.empty': '暂无已归档会话',
  'panel.count': '{n} 个会话',
  'row.copy': '复制会话 ID',
  'row.copied': '已复制',
  'row.copyFailed': '复制失败',
  'panel.notice': '恢复入口待上游支持；当前可从本面板复制会话 ID。',
} satisfies Record<string, string>

/** The archived namespace key union. */
export type ArchivedKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'panel.title': 'Archived sessions',
  'panel.empty': 'No archived sessions',
  'panel.count': '{n} sessions',
  'row.copy': 'Copy session ID',
  'row.copied': 'Copied',
  'row.copyFailed': 'Copy failed',
  'panel.notice': 'Restore needs upstream support; this panel copies a session id in the meantime.',
} satisfies Record<ArchivedKey, string>
