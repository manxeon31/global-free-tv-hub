export function httpsUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
export function playbackDecision(channel, country = null, now = new Date()) {
  if (channel.mode !== 'hls') return {allowed:false,reason:'Watch on the official broadcaster website.'};
  if (channel.rights !== 'approved' || !channel.rightsEvidence || !httpsUrl(channel.rightsEvidence)) return {allowed:false,reason:'Direct playback is awaiting rights approval.'};
  if (!channel.reviewExpiresAt || !Number.isFinite(Date.parse(channel.reviewExpiresAt)) || Date.parse(channel.reviewExpiresAt) <= now.getTime()) return {allowed:false,reason:'Feed approval needs renewal.'};
  if (channel.disabled || channel.drm !== 'none' || !httpsUrl(channel.streamUrl)) return {allowed:false,reason:'This feed is unavailable for direct playback.'};
  if (channel.geo?.status !== 'global') {
    if (!country || channel.geo?.status !== 'restricted' || !channel.geo.allowedCountries?.includes(country)) return {allowed:false,reason:'Regional eligibility cannot be confirmed. Use the official source.'};
  }
  return {allowed:true,reason:'Approved direct feed. Provider availability still applies.'};
}
export function filterChannels(channels, {query='',country='',language='',category='',savedOnly=false,saved=[]} = {}) {
  const needle=query.trim().toLocaleLowerCase();
  return channels.filter(c => !c.disabled && (!country || c.country===country) && (!language || c.language===language) && (!category || c.category===category) && (!savedOnly || saved.includes(c.id)) && [c.name,c.country,c.language,c.category].join(' ').toLocaleLowerCase().includes(needle));
}
