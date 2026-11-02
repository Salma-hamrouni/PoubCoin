// Waste detection via Gemini Vision API.
// Set EXPO_PUBLIC_GEMINI_KEY in your .env to enable real detection.
// Without a key, falls back to keyword-based heuristics on the filename.

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_KEY ?? '';

export interface WasteResult {
  type: string;
  icon: string;
  color: string;
  bin: string;
  impact: string;
  coins: number;
  tip: string;
  kg: string;
  urgency: string;
  degradation: string;
  co2: string;
  fromAI: boolean;
}

const WASTE_TYPES: WasteResult[] = [
  { type: 'Plastique',    icon: '🥤', color: '#2196F3', bin: 'Bac jaune ♻️',          impact: '500 ans de dégradation évités',         coins: 15, tip: 'Rincez les bouteilles avant de les déposer.',           kg: '~1–3 kg',   urgency: 'Élevée',   degradation: '450 ans',          co2: '~1.8 kg CO₂', fromAI: false },
  { type: 'Verre',        icon: '🍾', color: '#4CAF50', bin: 'Conteneur vert 🟢',      impact: '100% recyclable indéfiniment',          coins: 20, tip: 'Retirez les bouchons et capsules.',                      kg: '~2–4 kg',   urgency: 'Modérée',  degradation: '1 000 000 ans',    co2: '~0.5 kg CO₂', fromAI: false },
  { type: 'Organique',    icon: '🍂', color: '#8D6E63', bin: 'Composteur 🌱',          impact: 'Devient compost en 2 mois',             coins: 10, tip: 'Idéal pour faire du compost à la maison.',               kg: '~3–8 kg',   urgency: 'Faible',   degradation: '2–6 mois',         co2: '~0.3 kg CO₂', fromAI: false },
  { type: 'Métal',        icon: '🥫', color: '#FF9800', bin: 'Bac jaune ♻️',          impact: 'Économise 95% d\'énergie vs neuf',      coins: 25, tip: 'Écrasez les canettes pour gagner de la place.',         kg: '~1–5 kg',   urgency: 'Modérée',  degradation: '200–500 ans',      co2: '~2.1 kg CO₂', fromAI: false },
  { type: 'Papier',       icon: '📦', color: '#795548', bin: 'Bac bleu 📘',            impact: 'Sauve 17 arbres par tonne recyclée',    coins: 12, tip: 'Évitez les papiers gras ou souillés.',                  kg: '~0.5–2 kg', urgency: 'Faible',   degradation: '2–6 mois',         co2: '~0.8 kg CO₂', fromAI: false },
  { type: 'Électronique', icon: '🔋', color: '#9C27B0', bin: 'Point de collecte WEEE', impact: 'Contient des métaux rares précieux',    coins: 30, tip: 'Ne jamais jeter dans les ordures ménagères.',          kg: '~0.5–3 kg', urgency: 'Critique', degradation: '100–1000 ans',     co2: '~5.0 kg CO₂', fromAI: false },
  { type: 'Encombrant',   icon: '🪑', color: '#607D8B', bin: 'Déchetterie 🏭',         impact: 'Libère l\'espace public',               coins: 35, tip: 'Contacter la mairie pour enlèvement gratuit.',         kg: '~10–50 kg', urgency: 'Critique', degradation: 'Variable',         co2: '~3.5 kg CO₂', fromAI: false },
];

const GEMINI_TYPE_MAP: Record<string, string> = {
  plastic: 'Plastique', bottle: 'Plastique', bag: 'Plastique',
  glass: 'Verre', jar: 'Verre',
  organic: 'Organique', food: 'Organique', leaf: 'Organique',
  metal: 'Métal', can: 'Métal', aluminum: 'Métal',
  paper: 'Papier', cardboard: 'Papier',
  electronic: 'Électronique', battery: 'Électronique', phone: 'Électronique',
  furniture: 'Encombrant', sofa: 'Encombrant', mattress: 'Encombrant',
};

function findByType(type: string): WasteResult {
  return WASTE_TYPES.find(w => w.type === type) ?? WASTE_TYPES[0];
}

async function uriToBase64(uri: string): Promise<string> {
  const res = await fetch(uri);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = (reader.result as string).split(',')[1];
      resolve(b64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export interface VoiceAnalysis {
  wasteType: string;
  icon: string;
  priority: 'haute' | 'moyenne' | 'faible';
  description: string;
  fromAI: boolean;
}

const PRIORITY_KEYWORDS: Record<string, 'haute' | 'moyenne' | 'faible'> = {
  école: 'haute', enfant: 'haute', hôpital: 'haute', urgent: 'haute', dangereux: 'haute', beaucoup: 'haute',
  parc: 'moyenne', rue: 'moyenne', trottoir: 'moyenne',
};

export async function analyzeVoiceDescription(text: string): Promise<VoiceAnalysis> {
  const lower = text.toLowerCase();

  // Fallback keyword-based detection
  const keywordType =
    lower.includes('plastique') || lower.includes('bouteille') || lower.includes('sac') ? 'Plastique' :
    lower.includes('verre') ? 'Verre' :
    lower.includes('métal') || lower.includes('canette') || lower.includes('boîte') ? 'Métal' :
    lower.includes('carton') || lower.includes('papier') ? 'Papier' :
    lower.includes('électronique') || lower.includes('batterie') || lower.includes('téléphone') ? 'Électronique' :
    lower.includes('meuble') || lower.includes('canapé') || lower.includes('matelas') ? 'Encombrant' :
    'Plastique';

  const keywordPriority: 'haute' | 'moyenne' | 'faible' =
    Object.entries(PRIORITY_KEYWORDS).find(([k]) => lower.includes(k))?.[1] ?? 'moyenne';

  const fallback: VoiceAnalysis = {
    wasteType: keywordType,
    icon: findByType(keywordType).icon,
    priority: keywordPriority,
    description: text,
    fromAI: false,
  };

  if (!GEMINI_KEY) return fallback;

  try {
    const body = {
      contents: [{
        parts: [{
          text: `Tu es un assistant de tri de déchets. Analyse cette description et réponds UNIQUEMENT en JSON valide sans markdown:
Description: "${text}"

Réponds avec ce format exact:
{"wasteType":"Plastique","priority":"haute","description":"description courte améliorée"}

wasteType: un de ces valeurs exactes: Plastique, Verre, Organique, Métal, Papier, Électronique, Encombrant
priority: haute, moyenne, ou faible
description: reformulation courte et claire (max 80 caractères)`,
        }],
      }],
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    const json = await res.json();
    const raw = (json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const wt = WASTE_TYPES.find(w => w.type === parsed.wasteType) ?? WASTE_TYPES[0];
    return {
      wasteType: wt.type,
      icon: wt.icon,
      priority: ['haute', 'moyenne', 'faible'].includes(parsed.priority) ? parsed.priority : 'moyenne',
      description: parsed.description ?? text,
      fromAI: true,
    };
  } catch {
    return fallback;
  }
}

export async function detectWaste(imageUri: string): Promise<WasteResult> {
  if (!GEMINI_KEY) {
    // No key — return random (existing behaviour)
    return { ...WASTE_TYPES[Math.floor(Math.random() * WASTE_TYPES.length)], fromAI: false };
  }

  try {
    const base64 = await uriToBase64(imageUri);
    const body = {
      contents: [{
        parts: [
          { text: 'Identify the type of waste in this image. Reply with ONE word from: plastic, glass, organic, metal, paper, electronic, furniture. Nothing else.' },
          { inlineData: { mimeType: 'image/jpeg', data: base64 } },
        ],
      }],
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );

    const json = await res.json();
    const raw = (json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').toLowerCase().trim();
    const matched = Object.entries(GEMINI_TYPE_MAP).find(([k]) => raw.includes(k));
    const wasteType = matched ? matched[1] : 'Plastique';
    return { ...findByType(wasteType), fromAI: true };
  } catch {
    return { ...WASTE_TYPES[Math.floor(Math.random() * WASTE_TYPES.length)], fromAI: false };
  }
}
