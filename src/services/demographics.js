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
    genderLabel: isFemale ? '👗 Női' : '👔 Férfi',
    ageDesc: bracketDescription,
    ageGroupKey: bracketCode,
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
- SZIGORÚAN TILTOTT bármilyen merev, szűk, felnőttes szabásvonal, zakó, galléros ing, nyakkendő vagy merev talpú cipő!
- PULÓVER & KÖTÖTTÁRU ELEMZÉSEK: Pulóver, kardigán vagy felső alá KIZÁRÓLAG puha pamut bodyt, pamut kisinget vagy rugdalózót javasolj! SOHA NE javasolj inget vagy merev gallért a pulóver alá!
- KIZÁRÓLAG kényelmes, 100% bőrbarát természetes pamut/gyapjú darabokat, rugdalózókat, puha bodykat, kocsicipőket/puhatalpú lábbeliket és meleg babakocsis overálokat javasolj!
- Fókusz: pelenkabarát fazonok, könnyű öltöztethetőség, puha meleg rétegek.`;
  }

  if (isPreschool) {
    return `[KOROSZTÁLYI SPECIFIKÁCIÓ: Bölcsődés és óvodás korosztály (3–6 év, ${gender}, ${age} éves)]:
- SZIGORÚAN TILTOTT a felnőtt merev öltönyzakó, élvasalt nadrág, nyakkendő vagy felnőtt bőrcipő!
- PULÓVER & KÖTÖTTÁRU ELEMZÉSEK: Pulóver vagy kardigán alá KIZÁRÓLAG kényelmes, puha pamut pólót vagy hosszú ujjú pamut alsó felsőt javasolj! SOHA NE javasolj merev galléros inget a pulóver alá!
- KIZÁRÓLAG kényelmes, gumis derekú nadrágokat (pamut, kordbársony, melegítő), tépőzáras vagy belebújós kényelmes lábbeliket, puha pamut kardigánokat/pulóvereket és víz- és szélálló őszi kabátokat javasolj!
- Fókusz: óvodai és játszótéri strapabíró kényelem, önálló öltözködést segítő fazonok.`;
  }

  if (isSchoolChild) {
    return `[KOROSZTÁLYI SPECIFIKÁCIÓ: Kisiskolás korosztály (7–12 év, ${gender}, ${age} éves)]:
- SZIGORÚAN TILTOTT a felnőtt merev zakó, fésűsgyapjú öltönynadrág, nyakkendő vagy merev felnőtt bőrcipő!
- PULÓVER & KÖTÖTTÁRU ELEMZÉSEK: Pulóver vagy kardigán alá kényelmes pamut pólót vagy hosszú ujjú pamut alsót javasolj! Hagyományos galléros inget kizárólag ritka iskolai ünnepségnél említs!
- KIZÁRÓLAG kényelmes és csinos iskolai/szabadidős pamut, kordbársony és farmer nadrágokat, puha pamutkötött pulóvereket és kardigánokat, valamint strapabíró, kényelmes sneakereket vagy vízálló őszi bokacipőket javasolj!
- Fókusz: iskolai kényelem, játék és mozgásszabadság, réteges és meleg őszi-téli darabok.`;
  }

  if (isTeen) {
    return `[KOROSZTÁLYI SPECIFIKÁCIÓ: Kiskamasz és tinédzser korosztály (13–18 év, ${gender}, ${age} éves)]:
- Laza, trendi, önkifejező suli- és szabadidős szetteket javasolj (kényelmes relaxed/straight nadrágok, kapucnis pulóverek, finomkötöttek, sneakerek, bomber és puffer dzsekik)!
- Pulóverek alá kényelmes pamut póló vagy laza réteg illik.
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

/**
 * Returns dynamic styling preset suggestions for CustomRulesCard based on demographics
 */
export function getDemographicPresetRules(demographics) {
  const { isBaby, isPreschool, isSchoolChild, isTeen, isFemale } = demographics;

  if (isBaby) {
    return [
      'Csak 100% tiszta pamut és bőrbarát természetes anyagok',
      'Csak patentos, könnyen öltöztethető és pelenkabarát fazonok',
      'Kerüljük a merev talpú cipőket és kemény lábbeliket',
      'Kerüljük a szűk nyakkivágásokat és merev gallérokat',
      'Pulóver és kardigán alá puha pamut bodyt rétegezzünk',
      'Kerüljük a műszálas poliésztert és nehezen mosható anyagokat'
    ];
  }

  if (isPreschool) {
    return [
      'Csak gumis derekú, kényelmes nadrágok (pamut, kordbársony, melegítő)',
      'Csak tépőzáras vagy belebújós kényelmes lábbelik',
      'Hétköznapokon kerüljük a merev felnőttes galléros ingeket és nyakkendőt',
      'Csak mosógépben könnyen mosható és strapabíró anyagok',
      'Pulóver alá kényelmes pamut pólót vagy hosszú ujjú pamut alsót hordjon',
      'Kerüljük a merev talpú és kényelmetlen cipőket'
    ];
  }

  if (isSchoolChild) {
    return [
      'Kényelmes iskolai pamut és strapabíró mozgásbarát ruhák',
      'Kerüljük a merev felnőttes darabokat (öltöny, zakó) a mindennapokban',
      'Könnyen kezelhető, mosható darabok',
      'Sneakerrel és kényelmes félcipővel hordható szettek',
      'Pulóver és kapucnis felső alá pamut póló rétegződjön',
      'Kerüljük a szűk, mozgást gátló szabásokat'
    ];
  }

  if (isTeen) {
    return [
      'Laza, kényelmes relaxed / straight fazonok',
      'Sneakerbarát, lezser nadrágok',
      'Kapucnis felsők és laza rétegek előnyben',
      'Kerüljük a túlzottan formális felnőtt darabokat hétköznap',
      'Csak minőségi és kényelmes anyagok'
    ];
  }

  // Adult Female
  if (isFemale) {
    return [
      'Nőies, kényelmes esésű finom anyagok (selyem, len, pamut, finomkötött)',
      'Kerülöm a műszálas poliésztert és akrilt',
      'Midi ruhákhoz rövidített blézert vagy derékövet preferálok',
      'Harmonikus, letisztult nőies színpaletta és lágy kontrasztok',
      'Kényelmes, prémium bőrcipők és elegáns tiszta sneakerek',
      'Csónaknyakú és masnis felsők tiszta dekoltázs-vonalának megőrzése'
    ];
  }

  // Adult Male
  return [
    'Nem szeretem a pólóingeket',
    'Csak 100% természetes anyagok (gyapjú, len, pamut, selyem, kasmír, bőr)',
    'Kerülöm a túl szűk / skinny szabásokat, a slim tailored sziluettet részesítem előnyben',
    'Zakóhoz és elegáns szettekhez nem hordok kereknyakú pólót',
    'Kerülöm a műszálas poliésztert és akrilt',
    'Zakóhoz és öltönyhöz csak velúrt vagy minőségi bőrcipőt hordok',
    'Fekete felsőrészek helyett a sötétkéket, teveszínt és antracitot preferálom'
  ];
}

/**
 * Returns dynamic style tag suggestions for AddClothingModal based on demographics
 */
export function getDemographicTags(demographics) {
  const { isBaby, isPreschool, isSchoolChild, isTeen, isFemale } = demographics;

  if (isBaby) {
    return [
      '100% Pamut',
      'Bőrbarát',
      'Patentos / Könnyen Öltöztethető',
      'Puha Body',
      'Rugdalózó',
      'Babakocsis Overál',
      'Puhatalpú',
      'Meleg Réteg',
      'Pelenkabarát',
      'Könnyen Mosható'
    ];
  }

  if (isPreschool) {
    return [
      'Kényelmes & Játszós',
      'Óvodai Alapdarab',
      'Gumis Derekú',
      'Tépőzáras Cipő',
      'Puha Pamut',
      'Víz- és Szélálló',
      'Strapabíró',
      'Csinos Zsúrruha',
      'Könnyen Mosható',
      'Meleg Réteges'
    ];
  }

  if (isSchoolChild) {
    return [
      'Iskolai Alapdarab',
      'Kényelmes & Mozgásbarát',
      'Puha Pamut',
      'Strapabíró Farmer/Chino',
      'Sneakerbarát',
      'Iskolai Ünneplő',
      'Sportos & Laza',
      'Vízálló Átmeneti',
      'Meleg Kötöttáru',
      'Könnyen Kezelhető'
    ];
  }

  if (isTeen) {
    return [
      'Laza & Relaxed',
      'Streetwear',
      'Suli Alapdarab',
      'Sneakerbarát',
      'Kapucnis Réteg',
      'Oversize / Boxy',
      'Kényelmes Denim',
      'Trendi',
      'Városi Laza',
      'Buli & Koncert'
    ];
  }

  if (isFemale) {
    return [
      'Elegáns & Nőies',
      'Smart Casual',
      'Midi / Maxi Ruha',
      'Finom Selyem/Len',
      'Nőies Blézer',
      'Minimalista Chic',
      'Kapszula Alapdarab',
      'Nyári Laza',
      'Prémium Bőr',
      'Harmonikus Színek'
    ];
  }

  return [
    'Elegáns',
    'Business',
    'Smart Casual',
    'Sprezzatura',
    'Old Money',
    'Quiet Luxury',
    'Streetwear',
    'Minimalista',
    'Időtlen',
    'Olasz szabás',
    'Nyári laza',
    'Alapdarab'
  ];
}

/**
 * Returns dynamic style archetypes for AddClothingModal based on demographics
 */
export function getDemographicArchetypes(demographics) {
  const { isBaby, isPreschool, isSchoolChild, isTeen, isFemale } = demographics;

  if (isBaby) {
    return [
      'Kényelmes & Bőrbarát Baba Alapok',
      'Meleg Babakocsis & Réteges',
      'Cuki Családi & Ünnepi',
      'Puha Természetes Pamut'
    ];
  }

  if (isPreschool) {
    return [
      'Kényelmes & Játszótéri Laza',
      'Óvodai Alapdarabok',
      'Csinos Zsúr & Ünnepi',
      'Strapabíró & Vízálló Kinti'
    ];
  }

  if (isSchoolChild) {
    return [
      'Kényelmes Iskolai & Szabadidős',
      'Sportos & Laza Mindennapi',
      'Iskolai Ünnepi & Csinos',
      'Strapabíró Kinti & Kirándulós'
    ];
  }

  if (isTeen) {
    return [
      'Laza Városi & Streetwear',
      'Trendi & Relaxed Suli',
      'Sportos & Kényelmes',
      'Minimalista & Letisztult',
      'Vintage & Retro'
    ];
  }

  if (isFemale) {
    return [
      'Klasszikus & Nőies Chic',
      'Smart Casual & Irodai',
      'Old Money & Quiet Luxury',
      'Minimalista & Modern',
      'Francia & Letisztult Elegancia',
      'Laza & Romantikus Nyári',
      'Vintage & Retro'
    ];
  }

  return [
    'Klasszikus & Időtlen',
    'Old Money & Quiet Luxury',
    'Smart Urban',
    'Streetwear',
    'Olasz Sprezzatura',
    'Minimalista',
    'Vintage & Retro'
  ];
}

/**
 * Evaluates whether a specific sartorial rule is applicable to a given demographic profile
 */
export function isRuleApplicableToDemographics(rule, demographics) {
  if (!rule) return false;
  if (!demographics) return true;

  const { isFemale, isMale, isBaby, isPreschool, isSchoolChild, isChild } = demographics;

  // Gender check
  if (rule.gender === 'womenswear_specific' && isMale) {
    return false;
  }
  if (rule.gender === 'menswear_specific' && isFemale) {
    return false;
  }

  // Children check: filter out rigid adult formal tailoring / tie / lapel rules
  if (isChild || isBaby || isPreschool || isSchoolChild) {
    const titleLower = (rule.title || '').toLowerCase();
    const descLower = (rule.ruleDescription || '').toLowerCase();
    const catLower = (rule.category || '').toLowerCase();

    // Adult only formal tailoring keywords
    const adultTailoringKeywords = [
      'hajtóka', 'hajtókás', 'díszzsebkendő', 'nyakkendő', 'zakógomb', 
      'öltönynadrág', 'mandzsetta', 'mandzsettalánc', 'szmoking', 'szmokingnadrág',
      'worsted wool', 'full break', 'no break', 'oxford cipő', 'peaked lapel',
      'notched lapel', 'masnis selyemblúz', 'dekoltázs'
    ];

    if (adultTailoringKeywords.some(kw => titleLower.includes(kw) || descLower.includes(kw))) {
      return false;
    }
  }

  return true;
}

