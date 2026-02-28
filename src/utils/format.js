function formatRuntime(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const parts = [];

  if (days) parts.push(`${days} hari`);
  if (hours) parts.push(`${hours} jam`);
  if (minutes) parts.push(`${minutes} menit`);
  parts.push(`${seconds} detik`);

  return parts.join(', ');
}

function formatJidToPhone(jid = '') {
  return jid.replace(/@s\.whatsapp\.net$/, '');
}

module.exports = {
  formatRuntime,
  formatJidToPhone
};
