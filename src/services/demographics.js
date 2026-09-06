// Central Demographic & Age-Group Intelligence Service for Sartorial Wardrobe Assistant
// Supports 5 official age brackets based on birth year, strictly Male/Female genders,
// and adaptive styling for all modules.

/**
 * Calculates demographics from a style profile
 */
export function getProfileDemographics(profile = {}) {
  const currentYear = new Date().getFullYear();
  let birthYear = null;

  if (profile.birthYear) {
    const parsedYear = parseInt(profile.birthYear, 10);
    if (!isNaN(parsedYear) && parsedYear > 1900 && parsedYear <= currentYear) {
      birthYear = parsedYear;
    }
  }

  // Fallback if age was stored directly
  let age = birthYear ? currentYear - birthYear : (profile.age ? parseInt(profile.age, 10) : 34);
  if (isNaN(age) || age < 0) age = 34;

  const isFemale = profile.gender === 'Női' || profile.gender === 'female';
  const gender = isFemale ? 'Női' : 'Férfi';

  // 5 Official Age Brackets
  const isBaby = age <= 2; // Csecsemő- és babakor (0–2 év)
  const isPreschool = age >= 3 && age <= 6; // Bölcsődés és óvodás korosztály (3–6 év)
  const isSchoolChild = age >= 7 && age <= 12; // Kisiskolás korosztály (7–12 év)
  const isTeen = age >= 13 && age <= 18; // Kiskamasz és tinédzser korosztály (13–18 év)
  const isAdult = age >= 19; // Felnőtt korosztály (19+ év)
  const isChild = age < 13; // Any child (baby, preschool, schoolchild)

  // Discretely formatted internal bracket label for AI prompts
  const bracketCode = isBaby 
    ? 'baby' 
    : isPreschool 
      ? 'preschool' 
      : isSchoolChild 
        ? 'schoolchild' 
        : isTeen 
          ? 'teen' 
          : 'adult';

  const bracketDescription = isBaby
    ? 'Csecsemő- és babakor (0–2 év)'
    : isPreschool
      ? 'Bölcsődés és óvodás korosztály (3–6 év)'
      : isSchoolChild
        ? 'Kisiskolás korosztály (7–12 év)'
        : isTeen
          ? 'Kiskamasz és tinédzser korosztály (13–18 év)'
          : 'Felnőtt korosztály (19+ év)';

  // Visual clean badge icon
  const icon = isFemale ? (isChild ? '👧' : '👗') : (isChild ? '👦' : '👔');

  // UI Header Badge (clean, no raw age label)
  const headerBadge = `${isFemale ? '👗 Női' : '👔 Férfi'}${profile.name ? ` • ${profile.name}` : ''}`;

  return {
    age,
    birthYear,
    gender,
    isFemale,
    isMale: !isFemale,
    isBaby,
    isPreschool,
    isSchoolChild,
    isTeen,
    isAdult,
    isChild,
    bracketCode,
    bracketDescription,
    icon,
    headerBadge
  };
}

/**
 * Builds AI System Instructions tailored to the user's exact age bracket and gender
 */
export function getDemographicSartorialInstructions(demographics, profile = {}) {
  const { isBaby, isPreschool, isSchoolChild, isTeen, isAdult, isFemale, gender, age, bracketDescription } = demographics;

  if (isBaby) {
    return `[KOROSZTÁLYI SPECIFIKÁCIÓ: Csecsemő- és babakor (0–2 év, ${gender}, ${age} éves)]:
- SZIGORÚAN TILTOTT bármilyen merev, szűk, felnőttes szabásvonal, zakó, galléros ing vagy merev talpú cipő!
- KIZÁRÓLAG kényelmes, 100% bőrbarát természetes pamut/gyapjú darabokat, rugdalózókat, puha bodykat, kocsicipőket/puhatalpú lábbeliket és meleg babakocsis overálokat javasolj!
- Fókusz: pelenkabarát fazonok, könnyű öltöztethetőség, puha meleg rétegek.`;
  }

  if (isPreschool) {
    return `[KOROSZTÁLYI SPECIFIKÁCIÓ: Bölcsődés és óvodás korosztály (3–6 év, ${gender}, ${age} éves)]:
- SZIGORÚAN TILTOTT a felnőtt merev öltönyzakó, élvasalt nadrág, nyakkendő vagy felnőtt bőrcipő!
- KIZÁRÓLAG kényelmes, gumis derekú nadrágokat (pamut, kordbársony, melegítő), tépőzáras vagy belebújós kényelmes lábbeliket, puha pamut kardigánokat/pulóvereket és víz- és szélálló őszi kabátokat javasolj!
- Fókusz: óvodai és játszótéri strapabíró kényelem, önálló öltözködést segítő fazonok.`;
  }

  if (isSchoolChild) {
    return `[KOROSZTÁLYI SPECIFIKÁCIÓ: Kisiskolás korosztály (7–12 év, ${gender}, ${age} éves)]:
- SZIGORÚAN TILTOTT a felnőtt merev zakó, fésűsgyapjú öltönynadrág, nyakkendő vagy merev felnőtt bőrcipő!
- KIZÁRÓLAG kényelmes és csinos iskolai/szabadidős pamut, kordbársony és farmer nadrágokat, puha pamutkötött pulóvereket és kardigánokat, valamint strapabíró, kényelmes sneakereket vagy vízálló őszi bokacipőket javasolj!
- Fókusz: iskolai kényelem, játék és mozgásszabadság, réteges és meleg őszi-téli darabok.`;
  }

  if (isTeen) {
    return `[KOROSZTÁLYI SPECIFIKÁCIÓ: Kiskamasz és tinédzser korosztály (13–18 év, ${gender}, ${age} éves)]:
- Laza, trendi, önkifejező suli- és szabadidős szetteket javasolj (kényelmes relaxed/straight nadrágok, kapucnis pulóverek, finomkötöttek, sneakerek, bomber és puffer dzsekik)!
- Kerüld a túl merev felnőtt formális elvárásokat, hacsak kifejezetten ünnepi eseményről nincs szó.`;
  }

  // Adult (19+): Flexible, learning adult profile
  const preferredStyles = Array.isArray(profile.preferredStyles) && profile.preferredStyles.length > 0
    ? profile.preferredStyles.join(', ')
    : 'Mindennapi Smart Casual & Letisztult Kapszula';

  return `[KOROSZTÁLYI SPECIFIKÁCIÓ: Felnőtt korosztály (${gender}, ${age} éves)]:
- RUGALMAS & TANULÓ PROFIL: Alkalmazkodj a felhasználó által preferált stílusokhoz (${preferredStyles}) és a megadott esemény jellegéhez!
- SOHA NE erőltess rá kizárólagosan merev formális öltönyt vagy zakót hétköznapi, lezser vagy streetwear eseményeknél!
- Laza alkalmaknál a minőségi sneaker + prémium pamut felső + kényelmes nadrág teljes értékű és stílusos összeállítás.
- Női profil esetén (${isFemale ? 'Igen' : 'Nem'}): ${isFemale ? 'női szabások, női nadrágok, szoknyák, ruhák, blézerek és finom rétegek' : 'férfi szabásvonalak, nadrágok és rétegek'} alkalmazandók.`;
}

/**
 * Generates dynamic quick prompts for StylistChatView based on profile demographics, wardrobe & weather
 */
export function getDynamicQuickPrompts(profile = {}, wardrobe = [], weather = null) {
  const demographics = getProfileDemographics(profile);
  const { isBaby, isPreschool, isSchoolChild, isTeen, isFemale } = demographics;

  const temp = typeof weather?.temperature === 'number' ? weather.temperature : null;
  const isCool = temp !== null && temp < 18;

  if (isBaby) {
    return [
      isCool ? 'Milyen réteges, meleg szett kell egy őszi babakocsis sétához?' : 'Kényelmes babaruha szett a mai napra',
      'Milyen puha rugdalózó és kocsicipő illik a meglévő darabokhoz?',
      'Hogyan rétegezzük a babát hűvös, szeles időben?',
      'Milyen babakocsis overál vagy meleg réteg hiányzik a gardróbból?',
      'Cuki és kényelmes összeállítás családi látogatásra'
    ];
  }

  if (isPreschool) {
    return [
      'Milyen kényelmes szettet adjak rá az óvodába / játszótérre?',
      isCool ? 'Milyen meleg, gumis derekú nadrág és cipő illik az őszi időhöz?' : 'Könnyed, laza óvodai összeállítás',
      'Csinos és kényelmes szett szülinapi zsúrra',
      'Milyen meleg pulóver vagy átmeneti kabát hiányzik a gardróbból?',
      'Hogyan rétegezzünk hűvös, játszós napokon?'
    ];
  }

  if (isSchoolChild) {
    return [
      'Milyen kényelmes és csinos szettet vegyek fel az iskolába?',
      isCool ? 'Milyen meleg őszi nadrág és cipő illik a meglévő felsőkhöz?' : 'Laza iskolai és játszós összeállítás',
      'Milyen kulcsdarab hiányzik leginkább a gardróbomból?',
      'Csinos szett szülinapi zsúrra vagy iskolai ünnepségre',
      'Hogyan kombináljam a pulóvereket és felsőket hűvös időben?'
    ];
  }

  if (isTeen) {
    return [
      'Laza és trendi összeállítás a suliba a meglévő ruháimból',
      'Hogyan kombináljam a sneakeremet egy laza nadrággal?',
      isCool ? 'Milyen meleg réteges szett illik hűvös időben moziba / barátokhoz?' : 'Kényelmes hétvégi városi szett',
      'Mit vegyek fel egy hétvégi buliba / koncertre?',
      'Milyen kulcsdarab hiányzik leginkább a ruhatáramból?'
    ];
  }

  // Adult (19+)
  if (isFemale) {
    return [
      'Mit vegyek fel holnap a meglévő ruháimból?',
      'Nőies, kényelmes smart casual szett a mai napra',
      isCool ? 'Milyen meleg rétegeket és nadrágot kombináljak hűvösben?' : 'Könnyed, stílusos összeállítás',
      'Milyen hiányzó kulcsdarab kellene a kapszula ruhatáramba?',
      'Stílustanács egy elegáns esti vacsorához'
    ];
  }

  // Adult Male
  return [
    'Mit vegyek fel holnap a meglévő ruháimból?',
    'Hogyan kombináljam a zakómat vagy pulóveremet lazább napon?',
    isCool ? 'Milyen nadrágot és cipőt válasszak hűvös őszi időben?' : 'Letisztult smart casual szett',
    'Milyen kulcsdarab hiányzik leginkább a gardróbomból?',
    'Stílustanács egy elegáns esti vacsorához'
  ];
}

/**
 * Generates dynamic event presets for OutfitsView & StylistView based on age bracket and gender
 */
export function getDynamicEventPresets(profile = {}, weather = null) {
  const demographics = getProfileDemographics(profile);
  const { isBaby, isPreschool, isSchoolChild, isTeen, isFemale } = demographics;

  if (isBaby) {
    return [
      '🍼 Babakocsis Séta a Parkban',
      '🏡 Otthoni Kényelmes Játék',
      '🎈 Családi Látogatás & Vendégség',
      '👶 Babaúszás / Ringató Foglalkozás',
      '🍂 Hűvös Őszi Kirándulás',
      '🎂 Első Szülinapi Ünnepség'
    ];
  }

  if (isPreschool) {
    return [
      '🧸 Bölcsi & Óvodai Napok',
      '🎠 Játszótér & Szabadtéri Játék',
      '🎂 Szülinapi Zsúr',
      '🍂 Hétvégi Családi Kirándulás',
      '🎭 Óvodai Ünnepség / Bábszínház',
      '🎈 Vendégség & Családi Esemény'
    ];
  }

  if (isSchoolChild) {
    return [
      '🎒 Iskola & Tanulás',
      '🎨 Szakkör & Különóra',
      '🎠 Játszótér & Park a Barátokkal',
      '🎂 Szülinapi Zsúr',
      '🍂 Hétvégi Kirándulás & Séta',
      '🎭 Iskolai Ünnepség / Színház'
    ];
  }

  if (isTeen) {
    return [
      '🎒 Suli & Gimnázium',
      '🍕 Mozi & Találkozó a Barátokkal',
      '🛹 Városi Séta / Park / Skate',
      '🎵 Buli & Koncert (Laza)',
      '🍂 Hétvégi Városi Kiruccanás',
      '🎉 Családi Ünnepség'
    ];
  }

  // Adult (19+)
  if (isFemale) {
    return [
      '💼 Smart Iroda & Munka',
      '☕ Kávézás & Városi Séta',
      '🍽️ Elegáns Vacsora & Estély',
      '🍸 Koktél / Baráti Koccintás',
      '🍂 Hétvégi Kiruccanás & Séta',
      '💍 Esküvő & Ünnepi Esemény',
      '🎵 Klub & Koncert'
    ];
  }

  // Adult Male
  return [
    '☕ Kávérandi & Séta',
    '💼 Smart Iroda & Tárgyalás',
    '🍽️ Elegáns Vacsora',
    '🍸 Esti Koktél / Bár',
    '🎵 Klub & Koncert (Lezser)',
    '🍂 Hétvégi Városi Kiruccanás',
    '💍 Esküvő & Ünnepi Esemény'
  ];
}
