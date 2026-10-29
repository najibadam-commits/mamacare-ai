import type { Language } from '../i18n/languages'
import type { GuideCategory, StageId } from './stages'

export interface GuideTranslation {
  title: string
  summary: string
  /** "## Heading", "- bullet" lines and plain paragraphs. */
  content: string
  keyTakeaways: string[]
  warning?: string
}

export interface SeedGuide {
  slug: string
  category: GuideCategory
  stage: StageId
  translations: Record<Language, GuideTranslation>
}

/**
 * MOCK CONTENT for prototyping. Summaries follow commonly published WHO / NPHCDA
 * maternal and child health guidance, but every article (and especially the Hausa
 * and Nigerian Pidgin translations) must be reviewed by qualified clinicians and
 * native-speaker health translators before real-world use.
 */
export const SEED_GUIDES: SeedGuide[] = [
  // ---------------------------------------------------------------------------
  {
    slug: 'early-pregnancy-nutrition',
    category: 'nutrition',
    stage: 'first-trimester',
    translations: {
      en: {
        title: 'Eating well in early pregnancy',
        summary: "Simple food choices and supplements that support your baby's early growth.",
        content: `## Why it matters
In the first 12 weeks your baby's brain, spine and organs form. Eating a variety of foods and taking folic acid helps this growth.

## What to eat
- Beans, groundnuts, eggs, fish and meat for protein and iron
- Dark green leafy vegetables (ugu, spinach, moringa) and orange fruits like pawpaw and mango
- Whole grains such as millet, maize, rice and sorghum
- Clean, safe water throughout the day

## Easing nausea
Eat small meals often, sip water between meals, and try dry biscuits or pap in the morning before getting out of bed. Avoid very oily or spicy foods if they upset you.

## Visit the clinic early
Book your first antenatal visit as soon as you think you are pregnant, ideally before 12 weeks. Ask about folic acid and iron tablets, and about tests for HIV, malaria and blood level.`,
        keyTakeaways: [
          'Start antenatal care before week 12',
          'Take folic acid and iron as your health worker advises',
          'Eat small, varied meals; avoid raw or undercooked meat and eggs',
          'Avoid alcohol, smoking and herbal mixtures your health worker has not approved',
        ],
        warning:
          'Go to a health facility today if you have vaginal bleeding, severe belly pain, or vomiting so much that you cannot keep water down.',
      },
      ha: {
        title: 'Cin abinci mai kyau a farkon ciki',
        summary: 'Zaɓin abinci da kari masu taimakawa ci gaban jaririnki a farko.',
        content: `## Me ya sa yake da muhimmanci
A cikin makonni 12 na farko ne ake samar da kwakwalwa, ƙashin baya da sauran sassan jikin jaririnki. Cin abinci iri-iri da shan folic acid na taimakawa wannan girma.

## Abin da za ki ci
- Wake, gyaɗa, ƙwai, kifi da nama don gina jiki da ƙarfe
- Ganyaye kore (kamar ugu, alayyafo, zogale) da 'ya'yan itatuwa masu launin lemu kamar gwanda da mangoro
- Hatsi irin su gero, masara, shinkafa da dawa
- Ruwa mai tsabta a duk rana

## Rage tashin zuciya
Ki ci ƙananan abinci sau da yawa, ki sha ruwa a tsakanin abinci, ki ci busasshen biskit ko koko da safe kafin ki tashi daga gado. Ki guji abinci mai mai ko yaji sosai idan yana damunki.

## Ki fara zuwa awo da wuri
Ki yi rajistar awo na farko da zarar kin ga alamun ciki, zai fi kyau kafin mako na 12. Ki tambayi ma'aikaciyar lafiya game da folic acid, kwayoyin ƙarfe, da gwajin HIV, zazzaɓin cizon sauro da yawan jini.`,
        keyTakeaways: [
          'Ki fara awo kafin mako na 12',
          "Ki sha folic acid da ƙarfe yadda ma'aikaciyar lafiya ta shawarta",
          'Ki ci ƙananan abinci iri-iri; ki guji ɗanyen nama ko ƙwai da ba a dafa sosai ba',
          "Ki guji barasa, taba da magungunan gargajiya da ma'aikaciyar lafiya ba ta amince da su ba",
        ],
        warning:
          'Ki je asibiti yau idan kina zubar jini daga farji, ciwon ciki mai tsanani, ko amai har ba za ki iya riƙe ruwa ba.',
      },
      pcm: {
        title: 'Make you chop well for early pregnancy',
        summary: 'Simple food and tablets wey go help your baby grow well for di beginning.',
        content: `## Why e important
For di first 12 weeks, your baby brain, back bone and body parts dey form. If you chop different kain food and take folic acid, e go help am.

## Wetin you fit chop
- Beans, groundnut, egg, fish and meat for protein and iron
- Green leaf like ugu, spinach, moringa and orange fruit like pawpaw and mango
- Grains like millet, maize, rice and guinea corn
- Clean water well well for di whole day

## If belle dey turn you
Chop small small food many times, drink water between chop, and eat dry biscuit or pap for morning before you comot from bed. Comot from oily or pepper food if e dey worry you.

## Go clinic early
Start antenatal as soon as you know say you get belle, e better before week 12. Ask di health worker about folic acid, iron tablets, and test for HIV, malaria and blood level.`,
        keyTakeaways: [
          'Start antenatal before week 12',
          'Take folic acid and iron as di health worker tell you',
          'Chop small small different food; no chop raw or half-cooked meat or egg',
          'No drink alcohol, no smoke, and no take local medicine wey health worker never approve',
        ],
        warning:
          'Go clinic today if blood dey comot from your private part, belle dey pain you serious, or you dey vomit so tay you no fit hold water.',
      },
    },
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'malaria-and-iron-second-trimester',
    category: 'antenatal-care',
    stage: 'second-trimester',
    translations: {
      en: {
        title: 'Malaria protection and iron in the second trimester',
        summary: 'Sleep under a treated net, take preventive malaria and iron medicines, and keep your visits.',
        content: `## Stay safe from malaria
Malaria in pregnancy can cause anaemia, miscarriage, early birth and a baby with low birth weight. Sleep under an insecticide-treated net every night.

## Preventive medicine
From about week 13, health workers give sulfadoxine-pyrimethamine (SP) at antenatal visits, at least a month apart, to prevent malaria. Take it at the clinic as advised, and do not buy medicines from roadside sellers.

## Iron and blood
Take your iron and folic acid tablets daily, with water or a citrus fruit rather than tea. Eat beans, liver, fish and green leafy vegetables. Your blood level will be checked at antenatal visits.

## Feeling your baby move
You may feel the first flutters between weeks 16 and 25. As the weeks go by, notice your baby's usual pattern of movement.`,
        keyTakeaways: [
          'Sleep under a treated net every night',
          'Take malaria preventive medicine only as given at the clinic',
          'Take iron tablets daily; avoid tea or coffee with them',
          'Keep every antenatal appointment',
        ],
        warning:
          'Fever, chills, severe headache, or feeling very weak and pale in pregnancy may be malaria or anaemia. Go to a health facility the same day.',
      },
      ha: {
        title: 'Kariya daga zazzaɓin cizon sauro da ƙarfe a watanni uku na biyu',
        summary:
          'Ki kwanta a cikin gidan sauro, ki sha maganin rigakafin zazzaɓin cizon sauro da ƙwayoyin ƙarfe, ki halarci awo.',
        content: `## Ki kare kanki daga zazzaɓin cizon sauro
Zazzaɓin cizon sauro a lokacin ciki na iya haifar da ƙarancin jini, zubewar ciki, haihuwa kafin lokaci da jariri mai ƙarancin nauyi. Ki kwanta a cikin gidan sauro mai magani kowane dare.

## Maganin rigakafi
Daga kusan mako na 13, ma'aikatan lafiya suna bayar da maganin SP (sulfadoxine-pyrimethamine) a lokacin awo, tsakanin kowanne akwai aƙalla wata ɗaya, don hana zazzaɓin cizon sauro. Ki sha shi a asibiti yadda aka umarta, kada ki sayi magani a wajen masu sayar da magani a bakin titi.

## Ƙarfe da jini
Ki sha ƙwayoyin ƙarfe da folic acid kullum da ruwa ko 'ya'yan itace masu tsami, ba shayi ba. Ki ci wake, hanta, kifi da ganyaye kore. Za a duba yawan jininki a lokacin awo.

## Jin motsin jariri
Za ki iya fara jin motsin jariri tsakanin mako na 16 zuwa 25. Yayin da makonni ke wucewa, ki lura da yadda jaririnki yake motsawa a kullum.`,
        keyTakeaways: [
          'Ki kwanta a cikin gidan sauro mai magani kowane dare',
          'Ki sha maganin rigakafin zazzaɓin cizon sauro kawai yadda aka ba ki a asibiti',
          'Ki sha ƙwayoyin ƙarfe kullum; ki guji shayi ko kofi tare da su',
          'Ki halarci dukkan alƙawuran awo',
        ],
        warning:
          'Zazzaɓi, jin sanyi, ciwon kai mai tsanani, ko rauni da yin fari-fari a lokacin ciki na iya zama zazzaɓin cizon sauro ko ƙarancin jini. Ki je asibiti a ranar.',
      },
      pcm: {
        title: 'Protect yourself from malaria and take iron for second trimester',
        summary: 'Sleep under net, take malaria preventive medicine and iron tablets, and no miss your visits.',
        content: `## Protect yourself from malaria
Malaria for pregnancy fit cause anaemia (low blood), miscarriage, early delivery and baby wey light well well. Sleep under treated mosquito net every night.

## Preventive medicine
From around week 13, health workers dey give SP (sulfadoxine-pyrimethamine) for antenatal visit, at least one month apart, to stop malaria. Take am for clinic as dem tell you, and no buy medicine from roadside seller.

## Iron and blood
Take your iron and folic acid tablet every day with water or orange, no use tea. Chop beans, liver, fish and green leaf. Dem go check your blood level for antenatal.

## Feel your baby move
You fit start to feel baby move between week 16 and 25. As weeks dey go, dey notice how your baby dey move every day.`,
        keyTakeaways: [
          'Sleep under treated net every night',
          'Take malaria preventive medicine only wey clinic give you',
          'Take iron tablet every day; no take tea or coffee with am',
          'No miss any antenatal appointment',
        ],
        warning:
          'If you get fever, cold body, serious headache, or you weak and your body dey pale for pregnancy, e fit be malaria or low blood. Go clinic di same day.',
      },
    },
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'third-trimester-danger-signs',
    category: 'warning-signs',
    stage: 'third-trimester',
    translations: {
      en: {
        title: 'Danger signs in late pregnancy',
        summary: 'Know the signs that mean you must go to a health facility immediately.',
        content: `## Go immediately if you have
- Vaginal bleeding of any amount
- Severe headache, blurred vision or seeing spots
- Swelling of the face or hands, especially with headache
- Fits (convulsions) or fainting
- Fluid leaking from the vagina before labour starts
- Your baby moving much less than usual, or not at all
- Fever, or severe pain in the belly

## Why these matter
These can be signs of pre-eclampsia (high blood pressure in pregnancy), bleeding problems or infection. They can put you and your baby at risk quickly, but good care given on time saves lives.

## Make a birth plan
Choose a health facility for delivery, agree how you will get there at night (transport, money, who goes with you), and pack a bag: clean cloths, baby clothes and your antenatal card. Think about who could donate blood if needed.`,
        keyTakeaways: [
          'Danger signs: bleeding, severe headache or blurred vision, fits, reduced baby movement, leaking fluid, fever',
          'Do not wait until morning - go immediately',
          'Plan transport and money for delivery before week 36',
          'Deliver at a health facility with a skilled health worker',
        ],
        warning:
          'Emergency: if you have any danger sign, go to the nearest health facility immediately. Do not wait at home or try traditional remedies first.',
      },
      ha: {
        title: 'Alamomin haɗari a ƙarshen ciki',
        summary: 'Ki san alamomin da ke nufin dole ki je asibiti nan take.',
        content: `## Ki je asibiti nan take idan kina da
- Zubar jini daga farji, ko da kaɗan ne
- Ciwon kai mai tsanani, gani a duhunce ko ganin tabo-tabo
- Kumburin fuska ko hannaye, musamman tare da ciwon kai
- Farfaɗiya ko suma
- Ruwa yana zuba daga farji kafin naƙuda ta fara
- Jariri ya rage motsi sosai, ko bai motsi ba kwata-kwata
- Zazzaɓi, ko ciwon ciki mai tsanani

## Me ya sa suke da muhimmanci
Waɗannan na iya zama alamomin hawan jini na ciki (pre-eclampsia), matsalar zubar jini ko kamuwa da cuta. Suna iya jefa ke da jaririnki cikin haɗari da sauri, amma kulawa mai kyau a kan lokaci tana ceton rai.

## Ki yi shirin haihuwa
Ki zaɓi asibitin da za ki haihu, ki tsara yadda za ki isa can da dare (abin hawa, kuɗi, wanda zai raka ki), ki shirya jaka: tsabtatattun zannuwa, kayan jariri da katin awo. Ki yi tunanin wanda zai iya ba da jini idan an buƙata.`,
        keyTakeaways: [
          'Alamomin haɗari: zubar jini, ciwon kai mai tsanani ko gani a duhunce, farfaɗiya, raguwar motsin jariri, zuban ruwa, zazzaɓi',
          'Kada ki jira safiya - ki je nan take',
          'Ki shirya abin hawa da kuɗin haihuwa kafin mako na 36',
          'Ki haihu a asibiti a hannun ƙwararriyar ma’aikaciyar lafiya',
        ],
        warning:
          'Gaggawa: idan kina da ɗaya daga cikin alamomin haɗari, ki je asibiti mafi kusa nan take. Kada ki jira a gida ko ki fara da maganin gargajiya.',
      },
      pcm: {
        title: 'Danger signs for late pregnancy',
        summary: 'Know di signs wey mean say you must run go hospital sharp sharp.',
        content: `## Go hospital immediately if you get
- Blood from your private part, even if na small
- Serious headache, blurry eye or you dey see spots
- Swollen face or hand, especially with headache
- Fits (convulsion) or you faint
- Water dey comot from your private part before labour start
- Your baby dey move small pass normal, or e no dey move at all
- Fever, or serious belle pain

## Why e matter
Dem fit be sign of high blood pressure for pregnancy (pre-eclampsia), bleeding wahala or infection. Dem fit put you and your baby for danger quick quick, but good care on time dey save life.

## Make birth plan
Choose di hospital where you go born, plan how you go reach there for night (transport, money, who go follow you), and pack bag: clean wrapper, baby clothes and your antenatal card. Think about who fit donate blood if dem need am.`,
        keyTakeaways: [
          'Danger signs: bleeding, serious headache or blurry eye, fits, baby no dey move well, water dey comot, fever',
          'No wait for morning - go immediately',
          'Plan transport and money for delivery before week 36',
          'Born for health facility with trained health worker',
        ],
        warning:
          'Emergency: if you see any danger sign, go di nearest health facility immediately. No wait for house or try local medicine first.',
      },
    },
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'breastfeeding-and-recovery',
    category: 'breastfeeding',
    stage: 'postnatal',
    translations: {
      en: {
        title: 'Breastfeeding and recovery after birth',
        summary: 'Start breastfeeding within the first hour and know when mother or baby needs urgent care.',
        content: `## Start within the first hour
Place your baby skin-to-skin on your chest right after birth and begin breastfeeding within the first hour. The first yellow milk (colostrum) protects your baby from infection.

## Breast milk only
For the first 6 months give only breast milk - no water, pap or other foods. Feed whenever baby wants, at least 8 times in 24 hours. A good latch means a wide open mouth, more of the dark area around the nipple in the mouth, and no pain.

## Take care of yourself
Rest, drink plenty of fluids and eat extra nutritious meals. Light bleeding that slowly reduces is normal for up to 6 weeks. Keep your baby's cord stump clean and dry. Go for postnatal checks within 24 hours, around day 3, around day 7-14, and at week 6.

## Family planning
Talk to a health worker about spacing your next pregnancy at least 2 years apart.`,
        keyTakeaways: [
          'Skin-to-skin contact and breastfeeding within one hour',
          'Only breast milk for the first 6 months',
          'Attend postnatal checks (24 hours, day 3, day 7-14, week 6)',
          "Keep your baby's cord stump clean and dry",
        ],
        warning:
          'Go to a health facility immediately if the mother has heavy bleeding (soaking a pad in an hour), fever, foul-smelling discharge, severe headache or fits; or if the baby is hot, very cold, feeding poorly or breathing fast.',
      },
      ha: {
        title: 'Shayar da nono da murmurewa bayan haihuwa',
        summary: 'Ki fara shayarwa cikin sa’a ta farko kuma ki san lokacin da uwa ko jariri ke buƙatar kulawa nan take.',
        content: `## Ki fara cikin sa'a ta farko
Ki ɗora jariri a ƙirjinki fata da fata nan da nan bayan haihuwa kuma ki fara shayarwa cikin sa'a ta farko. Madarar farko mai launin rawaya (kolostirum) tana kare jariri daga cututtuka.

## Nono kaɗai
A cikin watanni 6 na farko, ki ba shi nono kaɗai - babu ruwa, koko ko wani abinci. Ki shayar da shi duk lokacin da yake so, aƙalla sau 8 cikin awa 24. Kamawa mai kyau na nufin bakin jariri a buɗe sosai, yana riƙe da yawancin baƙin da'irar kan nono, kuma babu zafi.

## Ki kula da kanki
Ki huta, ki sha ruwa da yawa, kuma ki ci abinci mai gina jiki. Zubar jini kaɗan da ke raguwa a hankali al'ada ne har zuwa makonni 6. Ki kiyaye cibiyar jariri tsabta da bushewa. Ki halarci duba lafiya bayan haihuwa: cikin awa 24, kusan rana ta 3, kusan rana ta 7-14, da mako na 6.

## Tazarar haihuwa
Ki yi magana da ma'aikaciyar lafiya game da tazarar haihuwa ta aƙalla shekaru 2.`,
        keyTakeaways: [
          'Fata da fata da shayarwa cikin sa’a ɗaya',
          'Nono kaɗai har watanni 6',
          'Ki halarci duba lafiya (awa 24, rana ta 3, rana ta 7-14, mako na 6)',
          'Ki kiyaye cibiyar jariri tsabta da bushewa',
        ],
        warning:
          'Ki je asibiti nan take idan uwa tana zubar jini mai yawa (pad ɗaya ya jiƙe cikin awa ɗaya), zazzaɓi, ruwa mai wari daga farji, ciwon kai mai tsanani ko farfaɗiya; ko jariri yana da zafi, sanyi sosai, baya shan nono da kyau, ko yana saurin numfashi.',
      },
      pcm: {
        title: 'Breastfeeding and how to recover after delivery',
        summary: 'Start to breastfeed within di first hour and know when mama or baby need urgent care.',
        content: `## Start within di first hour
Put your baby for your chest skin to skin as soon as you born, and start to breastfeed within di first hour. Di first yellow milk (colostrum) dey protect your baby from infection.

## Breast milk only
For di first 6 months give only breast milk - no water, no pap, no any other food. Breastfeed anytime baby want, at least 8 times for 24 hours. Good latch mean say baby mouth open wide, e hold plenty of di black part around di nipple, and e no dey pain you.

## Take care of yourself
Rest, drink plenty water and chop extra good food. Small blood wey dey reduce small small na normal until 6 weeks. Keep di baby cord stump clean and dry. Go postnatal check within 24 hours, around day 3, around day 7-14, and week 6.

## Family planning
Talk to health worker about how to space your next belle at least 2 years.`,
        keyTakeaways: [
          'Skin to skin and breastfeeding within one hour',
          'Breast milk only for 6 months',
          'Go postnatal check (24 hours, day 3, day 7-14, week 6)',
          'Keep di baby cord stump clean and dry',
        ],
        warning:
          'Go health facility immediately if mama dey bleed plenty (one pad soak inside one hour), get fever, bad-smell water from private part, serious headache or fits; or if baby body hot, too cold, no dey suck well, or dey breathe fast fast.',
      },
    },
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'newborn-immunization-schedule',
    category: 'immunization',
    stage: 'baby-care',
    translations: {
      en: {
        title: "Your baby's first vaccines (0-6 months)",
        summary: 'Vaccines at birth, 6, 10 and 14 weeks protect your baby from serious diseases.',
        content: `## Why vaccinate
Vaccines protect babies from diseases like tuberculosis, polio, measles, pneumonia, rotavirus diarrhoea and others. Routine vaccines are free at government health facilities in Nigeria.

## Usual schedule in Nigeria
- At birth: BCG, oral polio (OPV0) and hepatitis B (HBV0)
- 6 weeks: first doses of Pentavalent, OPV, PCV (pneumonia) and rotavirus
- 10 weeks: second doses of these vaccines
- 14 weeks: third doses of Pentavalent, OPV and PCV, plus IPV
Your baby's card shows exactly which vaccines were given. NPHCDA can update the schedule, so follow your health worker's advice.

## After the injection
Mild fever, fussiness or a sore red spot where the injection went in is common for a day or two. Breastfeed more often, dress your baby lightly, and ask the health worker what to do about fever.

## Keep the card safe
Bring your baby's immunisation card to every visit.`,
        keyTakeaways: [
          'Routine vaccines are free at government health facilities',
          'Birth, 6, 10 and 14 weeks are the key visits in the first 6 months',
          'Mild fever or fussiness after vaccines is common and short-lived',
          'Always carry the immunisation card',
        ],
        warning:
          'Take your baby to a health facility immediately if, after a vaccine, there is a fit, difficulty breathing, swelling of the face, a high fever that does not go down, or the baby cannot be woken or will not feed.',
      },
      ha: {
        title: 'Allurar rigakafin farko na jaririnki (watanni 0-6)',
        summary: 'Allurai a lokacin haihuwa, makonni 6, 10 da 14 suna kare jaririnki daga manyan cututtuka.',
        content: `## Me ya sa ake yi wa jarirai allura
Allurar rigakafi tana kare jarirai daga cututtuka kamar tarin fuka, shan inna, kyanda, ciwon huhu, gudawa ta rotavirus da sauransu. Ana yin allurar rigakafi ta yau da kullum kyauta a asibitocin gwamnati a Najeriya.

## Jadawalin da aka saba yi a Najeriya
- Lokacin haihuwa: BCG, rigakafin shan inna ta baki (OPV0) da hepatitis B (HBV0)
- Makonni 6: allurar farko ta Pentavalent, OPV, PCV (ciwon huhu) da rotavirus
- Makonni 10: allura ta biyu ta waɗannan
- Makonni 14: allura ta uku ta Pentavalent, OPV da PCV, tare da IPV
Katin jaririnki zai nuna ainihin allurar da aka ba shi. Hukumar NPHCDA na iya sabunta jadawalin, don haka ki bi shawarar ma'aikaciyar lafiya.

## Bayan an yi allura
Zazzaɓi kaɗan, rashin natsuwa ko ja da ciwo a wurin allurar sun zama ruwan dare na kwana ɗaya ko biyu. Ki ƙara shayar da shi nono, ki sa masa sutura marar nauyi, ki tambayi ma'aikaciyar lafiya abin da za ki yi game da zazzaɓi.

## Ki kiyaye katin
Ki kawo katin rigakafin jariri a kowace ziyara.`,
        keyTakeaways: [
          'Ana yin allurar rigakafi ta yau da kullum kyauta a asibitocin gwamnati',
          'Haihuwa, makonni 6, 10 da 14 ne manyan ziyarori a watanni 6 na farko',
          'Zazzaɓi kaɗan ko rashin natsuwa bayan allura ya zama ruwan dare kuma yana wucewa da sauri',
          'Ki riƙa tafiya da katin rigakafi koyaushe',
        ],
        warning:
          'Ki kai jariri asibiti nan take idan bayan allura ya yi farfaɗiya, ya sha wahalar numfashi, fuskarsa ta kumbura, yana da zazzaɓi mai tsanani da ba ya sauka, ba a iya tashe shi, ko ya ƙi shan nono.',
      },
      pcm: {
        title: 'Your baby first vaccines (0-6 months)',
        summary: 'Vaccines for birth, 6, 10 and 14 weeks dey protect your baby from serious sickness.',
        content: `## Why dem dey give baby vaccine
Vaccine dey protect baby from sickness like TB, polio, measles, pneumonia, rotavirus diarrhoea and others. Routine vaccines free for government health facilities for Nigeria.

## Usual schedule for Nigeria
- Birth: BCG, polio for mouth (OPV0) and hepatitis B (HBV0)
- 6 weeks: first dose of Pentavalent, OPV, PCV (pneumonia) and rotavirus
- 10 weeks: second dose of dem
- 14 weeks: third dose of Pentavalent, OPV and PCV, plus IPV
Di baby card go show exactly which vaccine dem don give am. NPHCDA fit update di schedule, so follow wetin health worker tell you.

## After di injection
Small fever, baby dey fret or small red pain for di place dem inject am dey common for one or two days. Breastfeed pass normal, dress am light, and ask di health worker wetin to do for fever.

## Keep di card well
Carry your baby immunisation card go every visit.`,
        keyTakeaways: [
          'Routine vaccines free for government health facilities',
          'Birth, 6, 10 and 14 weeks na di main visits for first 6 months',
          'Small fever or fret after vaccine na normal and e dey pass quick',
          'Always carry di immunisation card',
        ],
        warning:
          'Carry your baby go health facility immediately if after vaccine e get fits, hard breathing, swollen face, high fever wey no dey go down, or baby no wake or no wan suck.',
      },
    },
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'complementary-feeding-and-vaccines',
    category: 'nutrition',
    stage: 'baby-care',
    translations: {
      en: {
        title: 'Feeding and vaccines from 6 to 24 months',
        summary: 'Start soft, nutritious foods at 6 months, keep breastfeeding, and complete the measles and yellow fever vaccines.',
        content: `## Start foods at 6 months
At 6 months, keep breastfeeding and add soft foods: 2-3 meals a day at 6-8 months, then 3-4 meals plus 1-2 snacks from 9 months.

## What to give
- Thick pap enriched with groundnut paste, milk or egg - not thin, watery pap
- Mashed beans, yam, potato, banana, pawpaw, and well-cooked fish or egg
- A little oil and mashed green leafy vegetables
- Feed from a clean cup and spoon; wash hands before cooking and feeding
Avoid sugary drinks and sweets, and do not give honey before 1 year.

## Vaccines and vitamin A
Around 9 months your baby needs measles, yellow fever and meningitis A vaccines; a second measles dose is given around 15 months. Vitamin A is given from 6 months, every 6 months, at the clinic or during campaigns.`,
        keyTakeaways: [
          'Keep breastfeeding up to 2 years or beyond',
          'Start soft, thick, nutritious foods at 6 months',
          'Measles and yellow fever vaccines around 9 months; second measles around 15 months',
          'Vitamin A every 6 months',
        ],
        warning:
          'See a health worker the same day if your child has diarrhoea with sunken eyes or a very dry mouth, refuses to feed or drink, breathes fast, or is unusually sleepy. Give oral rehydration solution (ORS) on the way if you have it.',
      },
      ha: {
        title: 'Ciyarwa da allurai daga watanni 6 zuwa 24',
        summary:
          'Ki fara abinci mai laushi mai gina jiki a wata na 6, ki ci gaba da shayarwa, kuma ki kammala allurar kyanda da zazzaɓin shawara.',
        content: `## Ki fara abinci a wata na 6
A wata na 6, ki ci gaba da shayar da nono kuma ki ƙara abinci mai laushi: sau 2-3 a rana a watanni 6-8, sannan sau 3-4 tare da ɗan abin ƙwalama sau 1-2 daga wata na 9.

## Abin da za ki ba shi
- Koko mai kauri da aka haɗa da man gyaɗa, madara ko ƙwai - ba ruwan koko mai laushi ba
- Dakakken wake, doya, dankali, ayaba, gwanda, da kifi ko ƙwai da aka dafa sosai
- Ɗan mai da dakakken ganyaye kore
- Ki ciyar da shi da kofi da cokali masu tsabta; ki wanke hannu kafin girki da ciyarwa
Ki guji abin sha mai zaƙi da alewa, kuma kada ki ba shi zuma kafin shekara ɗaya.

## Allurai da bitamin A
Kusan wata na 9 jariri yana buƙatar allurar kyanda, zazzaɓin shawara (yellow fever) da sankarau (Meningitis A); ana yin allurar kyanda ta biyu kusan wata na 15. Ana ba da bitamin A daga wata na 6, duk bayan watanni 6, a asibiti ko lokacin yaƙin neman rigakafi.`,
        keyTakeaways: [
          'Ki ci gaba da shayarwa har shekara 2 ko fiye',
          'Ki fara abinci mai laushi, kauri da gina jiki a wata na 6',
          'Allurar kyanda da zazzaɓin shawara kusan wata na 9; kyanda ta biyu kusan wata na 15',
          'Bitamin A duk bayan watanni 6',
        ],
        warning:
          'Ki ga ma’aikacin lafiya a ranar idan yaronki yana gudawa da idanu sun nutse ko bakinsa ya bushe sosai, ya ƙi ci ko sha, yana saurin numfashi, ko yana bacci fiye da yadda ya saba. Ki ba shi ruwan ORS a hanya idan kina da shi.',
      },
      pcm: {
        title: 'Food and vaccines from 6 to 24 months',
        summary: 'Start soft good food for 6 months, continue to breastfeed, and complete measles and yellow fever vaccines.',
        content: `## Start food for 6 months
For 6 months, continue breastfeeding and add soft food: 2-3 times a day for 6-8 months, then 3-4 times plus 1-2 small snacks from 9 months.

## Wetin to give am
- Thick pap wey you mix with groundnut paste, milk or egg - no watery pap
- Mashed beans, yam, potato, banana, pawpaw, and fish or egg wey cook well
- Small oil and mashed green leaf
- Feed am with clean cup and spoon; wash hand before you cook and before you feed am
No give am sugary drink and sweet, and no give honey before 1 year.

## Vaccines and vitamin A
Around 9 months, baby need measles, yellow fever and meningitis A vaccine; second measles dey come around 15 months. Dem dey give vitamin A from 6 months, every 6 months, for clinic or during campaign.`,
        keyTakeaways: [
          'Continue to breastfeed reach 2 years or more',
          'Start soft, thick, good food for 6 months',
          'Measles and yellow fever vaccine around 9 months; second measles around 15 months',
          'Vitamin A every 6 months',
        ],
        warning:
          'See health worker di same day if your pikin dey stool water with sunken eye or very dry mouth, no wan chop or drink, dey breathe fast, or dey sleep pass normal. Give ORS for road if you get am.',
      },
    },
  },
]
