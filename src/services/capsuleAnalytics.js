/**
 * Capsule Wardrobe Intelligence & Scoring Analytics Service
 * Evaluates the 4 core pillars of a high-functioning capsule wardrobe:
 * 1. Core Category Balance & Depth (35 pts)
 * 2. Seasonal Versatility & Footwear Health (25 pts)
 * 3. Garment Condition & Integrity (20 pts)
 * 4. Fabric Quality & Natural Fibers (20 pts)
 */

export function calculateCapsuleWardrobeIndex(wardrobe = [], profile = {}) {
  if (!Array.isArray(wardrobe) || wardrobe.length === 0) {
    return {
      totalScore: 0,
      statusTier: {
        label: 'Kezdeti Fázis',
        color: 'rose',
        badgeClass: 'badge-rose',
        description: 'Tölts fel legalább 3–5 alapdarabot a ruhatáradba az elemzéshez!'
      },
      breakdown: {
        coreBalance: { score: 0, max: 35, label: 'Alapkategóriák & Arányok', percent: 0 },
        seasonalFootwear: { score: 0, max: 25, label: 'Szezonalitás & Lábbelik', percent: 0 },
        conditionIntegrity: { score: 0, max: 20, label: 'Ruhaállapot', percent: 0 },
        fabricQuality: { score: 0, max: 20, label: 'Anyagminőség', percent: 0 }
      },
      categoryCounts: {},
      insights: ['Még nincsenek rögzített ruhadarabok a gardróbodban.']
    };
  }

  const isFemale = profile?.gender === 'Női' || profile?.gender === 'female';
  const insights = [];

  // Category counts
  const categoryCounts = wardrobe.reduce((acc, item) => {
    const cat = item.category || 'tops';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {
    tops: 0,
    bottoms: 0,
    outerwear: 0,
    shoes: 0,
    knitwear: 0,
    dresses: 0,
    accessories: 0
  });

  // --------------------------------------------------------------------------
  // Pillar 1: Core Category Balance & Depth (Max 35 points)
  // --------------------------------------------------------------------------
  let coreBreadthScore = 0;
  // Breadth (up to 20 pts): Tops (4), Bottoms/Dresses (5), Shoes (5), Outerwear (3), Knitwear (3)
  if (categoryCounts.tops > 0) coreBreadthScore += 4;
  if (categoryCounts.bottoms > 0 || (isFemale && categoryCounts.dresses > 0)) coreBreadthScore += 5;
  if (categoryCounts.shoes > 0) coreBreadthScore += 5;
  if (categoryCounts.outerwear > 0) coreBreadthScore += 3;
  if (categoryCounts.knitwear > 0) coreBreadthScore += 3;

  // Depth & Minimum Combinable Foundation (up to 15 pts)
  let coreDepthScore = 0;
  if (categoryCounts.tops >= 2) coreDepthScore += 4;
  else if (categoryCounts.tops === 1) coreDepthScore += 2;

  const lowerBodyTotal = categoryCounts.bottoms + (isFemale ? categoryCounts.dresses : 0);
  if (lowerBodyTotal >= 2) coreDepthScore += 4;
  else if (lowerBodyTotal === 1) coreDepthScore += 2;

  if (categoryCounts.shoes >= 2) coreDepthScore += 4;
  else if (categoryCounts.shoes === 1) coreDepthScore += 2;

  if (categoryCounts.outerwear >= 1 && categoryCounts.knitwear >= 1) coreDepthScore += 3;
  else if (categoryCounts.outerwear >= 1 || categoryCounts.knitwear >= 1) coreDepthScore += 1.5;

  const coreBalanceScore = Math.min(35, Math.round(coreBreadthScore + coreDepthScore));

  if (categoryCounts.tops === 0) insights.push('Hiányzik bázis felső (ing vagy póló).');
  if (lowerBodyTotal === 0) insights.push('Hiányzik alsórész (nadrág vagy szoknya).');
  if (categoryCounts.shoes === 0) insights.push('Hiányzik rögzített lábbeli.');

  // --------------------------------------------------------------------------
  // Pillar 2: Seasonal Versatility & Footwear Health (Max 25 points)
  // --------------------------------------------------------------------------
  // Analyze footwear seasonal breadth (up to 15 pts)
  const shoesList = wardrobe.filter(w => w.category === 'shoes');
  let hasWarmFootwear = false;
  let hasColdFootwear = false;

  shoesList.forEach(shoe => {
    const nameLower = (shoe.name || '').toLowerCase();
    const subLower = (shoe.subCategory || '').toLowerCase();
    const seasonLower = (shoe.season || '').toLowerCase();

    const isCold = subLower.includes('boot') || subLower.includes('chelsea') || 
                   nameLower.includes('csizma') || nameLower.includes('bakancs') || 
                   nameLower.includes('bélelt') || seasonLower.includes('tél') || seasonLower.includes('ősz');
    
    const isWarm = subLower.includes('loafer') || subLower.includes('sneaker') || 
                   subLower.includes('sandal') || subLower.includes('mokaszin') || 
                   nameLower.includes('loafer') || nameLower.includes('mokaszin') || 
                   nameLower.includes('vászon') || nameLower.includes('nyár') || 
                   (!isCold && (nameLower.includes('cipő') || nameLower.includes('sneaker')));

    if (isCold) hasColdFootwear = true;
    if (isWarm) hasWarmFootwear = true;
  });

  let footwearHealthScore = 0;
  if (shoesList.length > 0) {
    if (hasWarmFootwear && hasColdFootwear) {
      footwearHealthScore = 15;
    } else if (hasWarmFootwear || hasColdFootwear) {
      footwearHealthScore = 9;
      if (!hasColdFootwear) insights.push('Kritikus hiány: nincs rögzítve hűvös/téli lábbeli (pl. Chelsea csizma).');
      if (!hasWarmFootwear) insights.push('Kritikus hiány: nincs rögzítve tavaszi/nyári lábbeli (pl. bőr loafer).');
    }
  }

  // Layering versatility (up to 10 pts)
  let layeringScore = 0;
  const hasBase = categoryCounts.tops > 0;
  const hasMid = categoryCounts.knitwear > 0;
  const hasOuter = categoryCounts.outerwear > 0;

  if (hasBase && hasMid && hasOuter) layeringScore = 10;
  else if ((hasBase && hasMid) || (hasBase && hasOuter)) layeringScore = 7;
  else if (hasBase || hasMid || hasOuter) layeringScore = 4;

  const seasonalFootwearScore = Math.min(25, Math.round(footwearHealthScore + layeringScore));

  // --------------------------------------------------------------------------
  // Pillar 3: Garment Condition & Integrity (Max 20 points)
  // --------------------------------------------------------------------------
  const replacementItems = wardrobe.filter(w => 
    w.condition?.includes('Lecserélendő') || 
    w.condition?.includes('Javításra') || 
    w.condition === 'poor'
  );
  const goodConditionRatio = (wardrobe.length - replacementItems.length) / wardrobe.length;
  const conditionIntegrityScore = Math.min(20, Math.round(goodConditionRatio * 20));

  if (replacementItems.length > 0) {
    insights.push(`${replacementItems.length} db ruhadarab megújításra vagy javításra szorul.`);
  }

  // --------------------------------------------------------------------------
  // Pillar 4: Fabric Quality & Natural Fibers (Max 20 points)
  // --------------------------------------------------------------------------
  const avgQuality = wardrobe.reduce((acc, item) => acc + (item.qualityScore || 8.0), 0) / wardrobe.length;
  
  // Natural fiber analysis
  const naturalKeywords = ['gyapjú', 'wool', 'kasmír', 'cashmere', 'pamut', 'cotton', 'len', 'linen', 'selyem', 'silk', 'bőr', 'leather'];
  const syntheticKeywords = ['100% poliészter', 'polyester', 'akril', 'műbőr', 'pu bőr'];

  const naturalCount = wardrobe.filter(w => {
    const mat = (w.material || '').toLowerCase();
    const isNatural = naturalKeywords.some(kw => mat.includes(kw));
    const isSynthetic = syntheticKeywords.some(kw => mat.includes(kw));
    return isNatural && !isSynthetic;
  }).length;

  const naturalRatio = naturalCount / wardrobe.length;
  const qualityPillar = (avgQuality / 10) * 12; // up to 12 pts
  const naturalPillar = naturalRatio * 8; // up to 8 pts
  const fabricQualityScore = Math.min(20, Math.round(qualityPillar + naturalPillar));

  // --------------------------------------------------------------------------
  // Total Score & Tier Classification
  // --------------------------------------------------------------------------
  const totalScore = Math.min(100, Math.max(0, 
    coreBalanceScore + seasonalFootwearScore + conditionIntegrityScore + fabricQualityScore
  ));

  let statusTier = {
    label: 'Prémium Kapszula',
    color: 'emerald',
    badgeClass: 'badge-emerald',
    description: 'Kiemelkedő variálhatóság, harmonikus anyagok és szilárd alapok minden szezonra.'
  };

  if (totalScore < 50) {
    statusTier = {
      label: 'Kezdeti Fázis',
      color: 'rose',
      badgeClass: 'badge-rose',
      description: 'Alapkategóriák és kulcsdarabok felvitele javasolt a magabiztos kombinálhatósághoz.'
    };
  } else if (totalScore < 70) {
    statusTier = {
      label: 'Épülő Ruhatár',
      color: 'yellow',
      badgeClass: 'badge-gold',
      description: 'Jó induló bázis, szezonális hiánypótlásokkal tovább gazdagítható a variálhatóság.'
    };
  } else if (totalScore < 85) {
    statusTier = {
      label: 'Erős Alap Ruhatár',
      color: 'amber',
      badgeClass: 'badge-gold',
      description: 'Kiváló variálhatóság, kisebb szezonális/funkcionális kiegészítésekkel tökéletesíthető.'
    };
  }

  return {
    totalScore,
    statusTier,
    averageQuality: avgQuality.toFixed(1),
    replacementCount: replacementItems.length,
    breakdown: {
      coreBalance: {
        score: coreBalanceScore,
        max: 35,
        percent: Math.round((coreBalanceScore / 35) * 100),
        label: 'Alapkategóriák & Arányok'
      },
      seasonalFootwear: {
        score: seasonalFootwearScore,
        max: 25,
        percent: Math.round((seasonalFootwearScore / 25) * 100),
        label: 'Szezonalitás & Lábbelik'
      },
      conditionIntegrity: {
        score: conditionIntegrityScore,
        max: 20,
        percent: Math.round((conditionIntegrityScore / 20) * 100),
        label: 'Ruhaállapot'
      },
      fabricQuality: {
        score: fabricQualityScore,
        max: 20,
        percent: Math.round((fabricQualityScore / 20) * 100),
        label: 'Anyagminőség'
      }
    },
    categoryCounts,
    insights
  };
}
