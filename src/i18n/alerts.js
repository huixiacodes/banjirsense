// Alert copy in Malaysia's four main languages.
// BM uses the JPS level names (Normal / Waspada / Amaran / Bahaya).
// Have a native speaker review the 中文 and தமிழ் text before presenting.

export const LANGS = [
  { id: 'ms', label: 'BM' },
  { id: 'en', label: 'EN' },
  { id: 'zh', label: '中文' },
  { id: 'ta', label: 'தமிழ்' },
]

export const TITLE = {
  ms: 'AMARAN BANJIR',
  en: 'FLOOD WARNING',
  zh: '水灾警报',
  ta: 'வெள்ள எச்சரிக்கை',
}

export const LEVEL = {
  ms: { NORMAL: 'NORMAL', ALERT: 'WASPADA', WARNING: 'AMARAN', DANGER: 'BAHAYA' },
  en: { NORMAL: 'NORMAL', ALERT: 'ALERT', WARNING: 'WARNING', DANGER: 'DANGER' },
  zh: { NORMAL: '正常', ALERT: '警戒', WARNING: '警告', DANGER: '危险' },
  ta: { NORMAL: 'இயல்பு', ALERT: 'விழிப்பு', WARNING: 'எச்சரிக்கை', DANGER: 'ஆபத்து' },
}

const PPS = {
  ms: 'PPS (pusat pemindahan sementara) terdekat',
  en: 'the nearest PPS (temporary evacuation centre)',
  zh: '最近的临时疏散中心（PPS）',
  ta: 'அருகிலுள்ள தற்காலிக நிவாரண மையம் (PPS)',
}

const BODY = {
  ms: {
    NORMAL: (r, t) => `Paras air ${r} di ${t} normal. Tiada amaran buat masa ini.`,
    ALERT: (r, t) => `Paras air ${r} di ${t} WASPADA. Pantau keadaan dan sediakan beg kecemasan.`,
    WARNING: (r, t) => `Paras air ${r} di ${t} AMARAN. Bersedia untuk berpindah. Alihkan kenderaan ke kawasan tinggi.`,
    DANGER: (r, t) => `ARAHAN PINDAH. Paras air ${r} di ${t} BAHAYA. Pindah segera ke ${PPS.ms}.`,
  },
  en: {
    NORMAL: (r, t) => `${r} at ${t} is at normal level. No warning at this time.`,
    ALERT: (r, t) => `${r} at ${t} has reached ALERT level. Monitor updates and prepare an emergency bag.`,
    WARNING: (r, t) => `${r} at ${t} has reached WARNING level. Prepare to evacuate. Move vehicles to higher ground.`,
    DANGER: (r, t) => `EVACUATE NOW. ${r} at ${t} is at DANGER level. Go to ${PPS.en}.`,
  },
  zh: {
    NORMAL: (r, t) => `${r}（${t}）水位正常，目前没有警报。`,
    ALERT: (r, t) => `${r}（${t}）水位已达警戒水平。请留意最新消息，并准备好紧急包。`,
    WARNING: (r, t) => `${r}（${t}）水位已达警告水平。请准备撤离，并把车辆移到高处。`,
    DANGER: (r, t) => `撤离令：${r}（${t}）水位已达危险水平。请立即前往${PPS.zh}。`,
  },
  ta: {
    NORMAL: (r, t) => `${t} இல் ${r} நீர்மட்டம் இயல்பாக உள்ளது.`,
    ALERT: (r, t) => `${t} இல் ${r} நீர்மட்டம் விழிப்பு நிலையை அடைந்துள்ளது. அவசரப் பையைத் தயார் செய்யுங்கள்.`,
    WARNING: (r, t) => `${t} இல் ${r} நீர்மட்டம் எச்சரிக்கை நிலையை அடைந்துள்ளது. வெளியேறத் தயாராகுங்கள்.`,
    DANGER: (r, t) => `உடனே வெளியேறுங்கள். ${t} இல் ${r} நீர்மட்டம் ஆபத்தான நிலையில் உள்ளது. ${PPS.ta} க்குச் செல்லுங்கள்.`,
  },
}

/** Alert text for a station at a given status, in a given language. */
export function alertText(lang, status, station) {
  return {
    title: TITLE[lang],
    level: LEVEL[lang][status],
    body: BODY[lang][status](station.region.river, station.town),
  }
}
