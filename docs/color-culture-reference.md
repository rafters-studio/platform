# Cross-Cultural Color Reference for the Color API

Compiled 2026-10-04. Source material for a model writing color descriptions. Every claim carries a region, a meaning or convention, an interface implication, a confidence level, and a source URL. Claims that could not be sourced were dropped or moved to "Claims to avoid" at the end.

## How to use this file

- **Confidence.** **High** means several independent or primary sources agree. **Medium** means one decent source, a secondary summary, a reference work such as Wikipedia, or sources that partly disagree. Do not upgrade a medium claim when writing.
- **The word is not the hue.** Several strong associations belong to a word or an object, not to a color in general. Two examples: 黄 "yellow" meaning pornographic in Chinese, and the green _hat_ meaning cuckold in China. A description may mention them but must not say the hue itself is taboo in UI.
- **Regions are not monoliths.** "East Asia" splits into China, Japan, Korea, Taiwan and Hong Kong, and they differ. For Sub-Saharan Africa this file only has sourced material on Ghana (Akan and Asante) and Ethiopia. Do not generalize either to "Africa."
- **Requested categories with no sourced convention.** For these, write nothing regional and do not infer:
  - Banking brand colors by region
  - Sale or discount colors by region (for example "red sale tags")
  - Gender coding outside Europe and North America
  - Gray as the "disabled" UI state (common practice, but no authority was found)

---

## Cross-cutting evidence (applies to every family)

| #   | Region                                   | Claim                                                                                                                                                                                                                                                                                                                                                                           | Interface implication                                                                                                                                                                                     | Conf.                                   | Source                                                                                                                                                                             |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| X1  | 30 nations                               | Color-emotion associations are largely shared across 4,598 participants in 30 nations (mean pattern similarity r = .88). Nation still predicted associations beyond the universal pattern, and the similarity was higher between nations that are close in language or geography.                                                                                               | Start from shared associations, then layer documented local differences. Don't treat any color as meaning opposite things in different places unless a source says so.                                    | High                                    | https://infoscience.epfl.ch/record/280269 (Jonauskaite et al. 2020, _Psychological Science_, doi:10.1177/0956797620948810)                                                         |
| X2  | 30 nations                               | The shared associations: red with love and anger, yellow with joy, black and gray with sadness, white with relief, pink with love and pleasure.                                                                                                                                                                                                                                 | These are safe default emotional notes.                                                                                                                                                                   | High                                    | same as X1; summary at https://www.technologynetworks.com/neuroscience/news/sadness-is-purple-in-greece-white-in-china-how-people-associate-colors-with-emotions-around-the-340357 |
| X3  | China, Greece, Egypt                     | The study's notable local differences: white is more strongly tied to sadness in China (the authors link this to white funeral dress), purple to sadness in Greece (dark purple in Greek Orthodox mourning), and Egyptian participants did not link yellow with joy.                                                                                                            | Mention these when describing white, purple and yellow.                                                                                                                                                   | Medium (news summary of the paper)      | https://www.technologynetworks.com/neuroscience/news/sadness-is-purple-in-greece-white-in-china-how-people-associate-colors-with-emotions-around-the-340357                        |
| X4  | Austria/Germany vs Mainland China, Macau | In an implicit test pairing red and green with good and bad, Western participants showed a stronger red-bad/green-good effect than Mainland Chinese participants. The Chinese participants still showed the same direction, only more weakly. For red versus white, the two groups did not differ. The authors advise caution when using color-valence signals internationally. | Red still works for error/destructive status in Chinese-language UI; the effect is weaker, not reversed. Never imply red reads as "success" in Chinese status UI. Pair status colors with icons and text. | High (peer-reviewed)                    | https://pmc.ncbi.nlm.nih.gov/articles/PMC10017663 (Kawai et al. 2022, _Psychological Research_)                                                                                    |
| X5  | Germany, Japan                           | Color metaphors for abstract qualities such as importance, and physical ones such as weight, were largely consistent between German and Japanese participants.                                                                                                                                                                                                                  | Metaphor-based mappings (darker = heavier, saturated = more important) carry across these two cultures.                                                                                                   | Medium (dissertation)                   | https://opus.bibliothek.uni-wuerzburg.de/frontdoor/index/index/docId/15378 (Löffler 2017)                                                                                          |
| X6  | Lab, US                                  | Brightness and saturation predict emotional response more consistently than hue. Brighter is more pleasant; more saturated is more arousing.                                                                                                                                                                                                                                    | Lightness and chroma shifts change a color's register: pale reads calm, vivid reads urgent.                                                                                                               | High                                    | https://pubmed.ncbi.nlm.nih.gov/7996122/ (Valdez & Mehrabian 1994)                                                                                                                 |
| X7  | Lab, Germany                             | Saturated and bright colors raised arousal (self-report and skin conductance). Arousal rose from blue and green to red. Blue scored highest valence, but only when highly saturated.                                                                                                                                                                                            | Same as X6. Vivid red is the most arousing combination; vivid blue the most pleasant.                                                                                                                     | High                                    | https://pubmed.ncbi.nlm.nih.gov/28612080/ (Wilms & Oberfeld 2018)                                                                                                                  |
| X8  | 10 countries, 4 continents               | Blue was the most-liked color in every country surveyed, China included (23-33%). The second favorite varied: green, red, or purple (Hong Kong).                                                                                                                                                                                                                                | "Blue is widely liked" is a safe generalization.                                                                                                                                                          | Medium (commercial poll, large samples) | https://yougov.com/en-gb/articles/12331-blue-worlds-favourite-colour                                                                                                               |
| X9  | International standard                   | ISO 3864 safety colors: red for prohibition, danger and fire equipment; yellow for warning; green for safe condition, first aid and escape; blue for mandatory action. Shape carries the meaning as well.                                                                                                                                                                       | Red/yellow/green/blue status semantics have an international standards basis. Pair them with shape, as ISO does.                                                                                          | Medium (summary of the standard)        | https://en.wikipedia.org/wiki/ISO_3864                                                                                                                                             |
| X10 | Global, accessibility                    | WCAG 1.4.1: color must not be the only means of conveying information. Red-green deficiency affects about 1 in 12 men.                                                                                                                                                                                                                                                          | Every regional color convention must have a non-color backup: an icon, a sign (+/-), or text.                                                                                                             | High                                    | https://w3.org/WAI/WCAG22/Understanding/use-of-color.html                                                                                                                          |

---

## Red

### Symbolic meanings

- **China (celebration, luck).** Red has been the auspicious color for weddings, New Year, and gifts of money since at least the Han dynasty. Brides traditionally wear red and invitations are printed on red paper. _UI:_ red is festive and lucky in Chinese-market consumer contexts (Lunar New Year, weddings, gifting). **High.**
  - https://lammuseum.wfu.edu/2025/01/chinese-silk-sheet/
  - https://religionunplugged.com/news/2025/1/28/hongbao-a-history-of-the-red-envelopes-given-out-at-lunar-new-year
- **China (digital gifting).** WeChat launched digital red packets (hongbao) in 2014. Billions are sent over each Lunar New Year. _UI:_ in Chinese payments and social apps, a red envelope means a monetary gift, not an alert. **High.**
  - https://voanews.com/a/wechat-lunar-new-year-red-packets/3706039.html
  - https://en.wikipedia.org/wiki/WeChat_red_envelope
- **China (government).** Official government directives are called "red-head documents" (红头文件) for their red title. _UI:_ a red masthead connotes official authority in China. **Medium.**
  - https://theregreview.org/?p=16935
- **China (funerals).** Red is avoided at funerals because it signals joy; white flowers and envelopes are used. _UI:_ do not use festive red in condolence or memorial flows for Chinese audiences. **Medium** (funeral-industry source).
  - https://rosehills.com/planning-ahead/chinese-traditions
- **Japan (celebration).** Red and white together (kōhaku) mark celebrations. Gift envelopes for happy occasions use red-and-white cords; funerals use black-and-white. _UI:_ in Japan, red+white reads celebratory; avoid red+white in condolence contexts. **High.**
  - https://www.nippon.com/en/guide-to-japan/gu020005/shugi-and-koden-money-gifts-expressing-congratulations-or-condolences.html
  - https://en.wikipedia.org/wiki/K%C5%8Dhaku_maku
- **Korea (death taboo).** Writing a living person's name in red ink is widely taboo. It historically marked the dead or condemned, and red name stamps (dojang) are the exception. _UI:_ never render a Korean user's name itself in red (e.g., red usernames or a red-highlighted name). Red error text near a name field is not the same thing and is common on Korean sites. **Medium** (folklore archives and local press, consistent with each other).
  - https://gwangjunewsgic.com/arts-culture/korean-myths/behind-the-myth-the-red-pen/
  - https://folklore.usc.edu/?p=33368
- **India (weddings, marriage).** Sindoor (vermilion) in the hair parting marks a married Hindu woman, and red is a common North Indian Hindu bridal color. Practice varies widely by community. _UI:_ red signals marriage and auspiciousness in North Indian Hindu wedding contexts. Not pan-Indian; see White and Gold. **Medium.**
  - https://feminisminindia.com/2017/08/07/sindoor-symbol-marriage-patriarchy/
- **Ghana, Akan (funerals).** Kobene (red) is one of the three main adinkra funeral-cloth colors. In some families the closest relatives wear red, in others black. _UI:_ red can be a mourning color in Ghanaian contexts; do not assume red reads only as celebration or danger. **High** (museum).
  - https://www.cooperhewitt.org/2018/09/07/adinkra-message-and-medium/
- **Shia Islam (Ashura).** During Muharram mourning in Iran, red flags stand for Hussein's blood alongside black mourning dress. _UI:_ red has a martyrdom meaning in Shia religious contexts. **Medium.**
  - https://aljazeera.com/news/2026/6/25/ashura-ceremonies-intertwine-faith-and-support-for-state-in-iran
- **Catholic liturgy (Europe, Latin America and worldwide).** Red is used for Palm Sunday, Good Friday, Pentecost, and martyrs. _UI:_ relevant only to church or liturgical-calendar products; otherwise symbolic context only. **High.**
  - https://www.usccb.org/prayer-and-worship/liturgical-year-and-calendar/understanding-the-liturgical-colors
- **Pan-African.** Red appears in both pan-African sets: the Ethiopian green-yellow-red, and Garvey's 1920 red-black-green, where red stands for the blood shed for liberation. _UI:_ symbolic context only; no interface convention sourced. **High.**
  - https://fiav.org/wp-content/uploads/2021/04/13-12-Crampton-MarcusGarveyAndTheRastaColours.pdf
- **Politics (US vs most other countries).**
  - In the US, red has meant Republican since the 2000 election, when networks happened to converge on red for Bush. Before that, TV networks rotated the colors.
  - In most other countries, red is the color of the left.
  - South Korea's conservative party switched to red in 2012, and the Democratic Party uses blue.
  - _UI:_ red/blue in electoral or data charts carries partisan meaning that inverts by country. Avoid party colors for neutral categories.
  - **High** for the US. **Medium** for Korea.
  - https://fullsite.motherjones.com/?p=204931
  - https://www.cbsnews.com/amp/minnesota/news/democrat-republican-blue-red
  - https://v.daum.net/v/20250525104533083

### Interface conventions

- **Stock and finance: China and Taiwan.** Red = price up, green = price down. This is the reverse of the US and Europe. **High.**
  - https://lists.w3.org/Archives/Public/www-international/2005JulSep/0188.html
  - https://data.europa.eu/apps/data-visualisation-guide/colour-connotations
  - https://scholar.smu.edu/business_marketing_research/28
- **Stock and finance: Korea.** Red = up, blue = down. **Medium.**
  - https://lists.w3.org/Archives/Public/www-international/2005JulSep/0188.html
  - https://www.benzinga.com/general/education/21/10/23258001/did-you-know-you-dont-want-to-be-in-the-green-if-youre-trading-in-china-japan-or-taiwan
- **Stock and finance: Japan (mixed).**
  - Major brokers (Monex, Rakuten, SBI) and Nikkei show red = up, blue = down.
  - In 2005, Yahoo! Finance Japan showed black = up, red = down, and Infoseek red = up, green = down.
  - Many apps offer a toggle.
  - Separately, 赤字 _akaji_ ("red characters") means a deficit in Japanese accounting.
  - _UI:_ no single Japanese default is safe. Ship a user setting.
  - **Medium.**
  - https://lists.w3.org/Archives/Public/www-international/2005JulSep/0191.html
  - https://retirejapan.com/forum/viewtopic.php?p=38912
  - https://en.wiktionary.org/wiki/%E8%B5%A4%E5%AD%97
- **Stock and finance: Hong Kong (conflicting).** A Taiwanese business magazine says Hong Kong (Hang Seng) uses the Western green = up convention. A moomoo help page shows red = up. **Medium**; treat as unresolved.
  - https://www.businesstoday.com.tw/article/category/80402/post/202010220009/
  - https://www.moomooapp.com/us/support/topic3_22
- **Stock and finance: US and Europe.** Green = up, red = down. **High.**
  - https://lists.w3.org/Archives/Public/www-international/2005JulSep/0188.html
- **Finance UI rule.** Make the up/down color pair a locale default plus a user setting, never hardcoded. A 2005 proposal to add a locale-level "LC_STOCK_COLOR" setting is the precedent. Always pair the color with a +/- sign or arrow.
  - https://lists.w3.org/Archives/Public/www-international/2005JulSep/0188.html
- **Investor behavior.** Showing losses in red reduces risk-taking and lowers return expectations among Western investors. The effect is weaker in China, where red does not mark losses. _UI:_ the gain/loss palette changes user behavior, so it is not cosmetic. **High.**
  - https://scholar.smu.edu/business_marketing_research/28
  - https://behavioraleconomics.com/when-red-means-go
- **Error and danger status.** ISO 3864 uses red for prohibition and danger. Red-negative associations hold even in China, only more weakly (X4). _UI:_ red for error and destructive actions is defensible globally, given an icon and text. **High.**
- **Health and medical (all regions).**
  - The red cross on white is a protected emblem under the 1949 Geneva Conventions and national laws in nearly 200 countries. The Red Crescent and Red Crystal are protected too.
  - Games have been made to change health icons: Among Us recolored red to blue; Prison Architect recolored to green; Halo, Left 4 Dead and Fallout also changed.
  - _UI:_ never use a red cross (or red crescent) for a health, first-aid, or medical icon. Swapping in a crescent for Middle East and North Africa (MENA) markets does not fix it. Sourced alternatives are a green cross, a blue cross, the Star of Life, or a white-on-red cross.
  - **High.**
  - https://opiniojuris.org/2026/08/20/from-medkits-to-punk-rock-pop-culture-and-the-non-negotiable-protection-of-the-red-cross-emblem/
  - https://cdn.redcross.ca/prodmedia/crc/documents/1-1-6-CRC-Emblem-Misuse-Brochure.pdf
- **Games in mainland China.** 2019 rules ban blood of any color. Recoloring blood green or blue no longer complies. _UI:_ recoloring alone is not a workaround for China. **High.**
  - https://globalvoices.org/2019/05/10/tencents-new-game-shows-how-censorship-rules-are-implemented-in-china

### Lightness and saturation

- Vivid, saturated red is the most arousing color combination (X6, X7). A pale tint drops most of the urgency.
- No source documents pale versus vivid red carrying different cultural meanings. Don't invent one.

---

## Orange

- **Netherlands (national identity).** Orange comes from the royal House of Orange-Nassau and dominates King's Day and sports. _UI:_ orange reads as Dutch national pride in the Netherlands. **Medium.**
  - https://dutchreview.com/culture/history/why-does-the-netherlands-love-orange-full-explainer/
  - https://www.army.mil/article/234913/kings_day_colors_the_netherlands_orange
- **Ireland and Northern Ireland (politics, religion).** Orange stands for the Protestant and unionist tradition (William of Orange, the Orange Order) and green for the Gaelic, mostly Catholic tradition. The Irish tricolour puts white, for peace, between them. _UI:_ orange-versus-green pairings carry sectarian meaning in Northern Ireland. **High.**
  - https://historyireland.com/?p=36917
- **Ukraine (politics).** Orange was Yushchenko's 2004 campaign color, which gave the Orange Revolution its name. Yanukovych's camp took blue. _UI:_ orange-versus-blue can read as political in Ukraine; otherwise symbolic context only. **High.**
  - https://nvdatabase.swarthmore.edu/content/ukrainians-overthrow-dictatorship-orange-revolution-2004
- **Mexico (Día de Muertos).** Orange and yellow cempasúchil (marigold) flowers are believed to guide souls home on the ofrendas (home altars). It is festive remembrance, not somber. _UI:_ marigold orange connects to remembrance of the dead in Mexican contexts. **High.**
  - https://www.npr.org/2021/10/30/1050726374/why-marigolds-or-cempasuchil-are-the-iconic-flower-of-dia-de-los-muertos
- **China (Qing court).** Apricot yellow (xinghuang), "usually a shade of orange", was one of the graded imperial yellows for lower imperial ranks. _UI:_ symbolic context only; no interface convention sourced. **Medium.**
  - https://www.sothebys.com/en/articles/dragon-robe-decoded
- **Interface conventions.** No sourced regional convention found for orange status colors beyond ISO's yellow/amber warning (X9). Do not infer.
- **Lightness and saturation.** No sourced lightness or saturation shift in meaning; apply X6/X7 only.

## Saffron (distinct from orange)

- **India (national flag).** The top band of the Indian flag is "India saffron" (kesari), officially courage and sacrifice. Radhakrishnan described it as renunciation and disinterestedness. **Medium.**
  - https://en.wikipedia.org/wiki/Saffron_(color)
- **India (politics, religion).** Saffron is strongly tied to Hinduism and, especially since 2014, to Hindu nationalism; "saffronization" is a critical term. _UI:_ saffron is politically and religiously loaded in India. Avoid it as a neutral accent in Indian civic or news products; it is fine in festival or religious contexts. **High.**
  - https://kvia.com/entertainment/cnn-style/2022/03/11/in-todays-india-clothing-choices-signal-a-deepening-religious-divide/
  - https://m.thewire.in/article/sport/the-bjp-rsss-latest-saffron-project-what-hockey-indias-jersey-change-signifies
- **Lightness and saturation.** No sourced lightness or saturation shift in meaning; apply X6/X7 only.

---

## Yellow

- **China (imperial).** Bright yellow (minghuang) was reserved for the emperor and empress. The Qing graded shades of yellow by rank, and yellow is the color of earth and the center. **High** (museum and auction-house scholarship).
  - https://rom.on.ca/en/node/11352
  - https://www.sothebys.com/en/articles/dragon-robe-decoded
- **China (the word, not the hue).** 黄色 _huángsè_ also means pornographic; anti-vice campaigns are called 扫黄 "sweeping yellow." _UI:_ this attaches to the word, not to yellow in UI; major Chinese apps use yellow brand colors (Meituan). Avoid labelling Chinese-language content as "yellow." **High.**
  - https://languagelog.ldc.upenn.edu/nll/?p=3612
  - https://globalvoices.org/2014/02/12/china-cleaning-up-the-yellow/amp/
  - https://kr-asia.com/chinas-internet-goes-black-and-white-on-day-of-mourning-for-pandemic-victims
- **Hong Kong (politics).** Yellow means the pro-democracy camp, from the 2014 umbrellas, and blue means pro-police/pro-government. In 2019-20 businesses were sorted into "yellow" and "blue economic circles." _UI:_ a yellow/blue pairing can read as political in Hong Kong. **High.**
  - https://www.csmonitor.com/World/Asia-Pacific/2020/0130/Pocketbook-polarization-In-Hong-Kong-you-are-what-you-buy
  - https://www.fcchk.org/correspondent/are-you-blue-or-are-you-yellow-the-colours-dividing-hong-kong/
- **Brazil (national identity, politics).** The yellow-green national-team jersey was adopted by Bolsonaro supporters before the 2022 election. One poll found one in five Brazilians would not wear it for political reasons. _UI:_ yellow-green can read as partisan in Brazil around elections. **Medium.**
  - https://www.arise.tv/brazil-election-how-the-famous-yellow-football-shirt-has-become-politicised/
- **Egypt (emotion).** Egyptian participants did not link yellow with joy, unlike other nations (X3). **Medium.**
- **Ethiopia, pan-African.** Yellow (gold) is one of the Ethiopian flag colors adopted across pan-Africanism. _UI:_ green-yellow-red together reads as Ethiopian or pan-African identity; avoid using the trio as an arbitrary status scale. **High.**
  - https://fiav.org/wp-content/uploads/2021/04/13-12-Crampton-MarcusGarveyAndTheRastaColours.pdf
- **Japan (memorial).** In Kansai, yellow-and-white gift cords are used for memorial services. **Medium** (commercial etiquette source).
  - https://yamamotoyama.co.jp/en/blogs/column/reading284
- **Interface convention.** Yellow/amber for warning has an international standards basis (X9). **Medium.**
- **Lightness.** No sourced cultural meaning splits pale from vivid yellow. The general finding (X6) is that yellow hues rated among the least pleasant in lab ratings, which matters for large fields of saturated yellow.

## Gold

- **Ghana, Asante (royalty).** Gold symbolizes kingship. The Golden Stool (Sika Dwa Kofi) is the Asante nation's central sacred symbol. _UI:_ symbolic context only; no interface convention sourced. **Medium.**
  - https://smarthistory.org/?p=2002
- **China (Qing court).** Golden yellow (jinhuang) was a graded imperial color below bright yellow. _UI:_ symbolic context only; no interface convention sourced. **Medium.**
  - https://www.sothebys.com/en/articles/dragon-robe-decoded
- **Japan (celebration).** Gold-and-silver gift cords are the most formal celebratory choice, used for weddings and longevity celebrations. _UI:_ gold and silver suit formal celebratory designs in Japan (weddings, milestone greetings). **Medium.**
  - https://yamamotoyama.co.jp/en/blogs/column/reading284
- **India (Kerala weddings).** Cream with a gold border (kasavu) is the bridal sari for Kerala Hindu weddings. This is one example of Indian bridal color varying by region. _UI:_ do not assume red is the Indian wedding color; wedding products need regional variants. **Medium** (trade sources).
  - https://www.utsavpedia.com/weddings-festivals/the-serene-world-of-marriages-in-gods-own-country-weddings-in-kerala/
- **Interface conventions.** No sourced regional finance or banking convention for gold. Do not infer.
- **Lightness and saturation.** No sourced lightness or saturation shift in meaning; apply X6/X7 only.

---

## Green

### Symbolic meanings

- **Islam (religion; Middle East and North Africa (MENA), South Asia and wider).** The Qur'an describes the people of paradise in green garments (18:31, 76:21), and tradition holds the Prophet wore green. Green appears on mosque domes and Qur'an bindings, and on the flags of Saudi Arabia, Iran and Pakistan. _UI:_ green carries religious weight in Muslim-majority markets. Generally positive; avoid trivial or comic uses of green combined with Qur'anic script or religious motifs. **High.**
  - https://www.slate.com/articles/news_and_politics/explainer/2009/06/islamic_greenwashing.html
  - https://www.dar-alifta.org/en/article/details/481/is-there-any-relation-between-the-green-color-and-prophet-muhammad
- **Iran (politics).** Green was the Mousavi campaign color in 2009 and became the color of the Green Movement. _UI:_ green can read as political in Iranian contexts; otherwise symbolic context only. **High.**
  - https://www.slate.com/articles/news_and_politics/explainer/2009/06/islamic_greenwashing.html
- **China (the object, not the hue).** "Wearing a green hat" (戴绿帽子) means being a cuckold, a stigma traced back to at least the Yuan dynasty. _UI:_ do not put green hats on avatars, mascots or stickers for Chinese audiences. Green as a UI hue is fine; OPPO used a green brand for years. **High.**
  - https://folklore.usc.edu/green-hats-in-chinese-culture/
  - https://zolimacitymag.com/pop-cantonese-%E6%88%B4%E7%B6%A0%E5%B8%BD-wearing-green-hat/
- **Ireland and Northern Ireland.** Green stands for the Gaelic/Catholic tradition (see Orange). _UI:_ see Orange: avoid orange-versus-green oppositions for Northern Ireland audiences. **High.**
  - https://historyireland.com/?p=36917
- **Catholic liturgy.** Green is used for Ordinary Time. _UI:_ relevant only to church or liturgical-calendar products. **High.**
  - https://www.usccb.org/prayer-and-worship/liturgical-year-and-calendar/understanding-the-liturgical-colors
- **Pan-African (Ethiopia; Garvey).** Green is in both pan-African color sets; for Garvey it stood for "the luxuriant vegetation of our Motherland." _UI:_ symbolic context only; no interface convention sourced. **High.**
  - https://fiav.org/wp-content/uploads/2021/04/13-12-Crampton-MarcusGarveyAndTheRastaColours.pdf
- **Japan (language).** Green traffic lights are called _ao_ (blue). Since 1973 the government has specified the bluest permissible green. _UI:_ Japanese copy may call a green "go" or success state _ao_. Don't "correct" that in localization. **Medium.**
  - https://www.mentalfloss.com/transportation/why-does-japan-have-blue-traffic-lights-instead-green

### Interface conventions

- **Finance.**
  - US and Europe: green = gain.
  - China and Taiwan: green = loss.
  - Japan: mixed. Hong Kong: conflicting.
  - See the Red section for sources and the user-setting rule. **High.**
- **Success and safety status.** ISO 3864 uses green for safe condition, first aid, and escape (X9). _UI:_ green for success is defensible broadly. Chinese users show a weaker green-good association (X4), so pair it with an icon. **Medium.**
- **Health and pharmacy (Europe).** The green cross is the pharmacy sign in France, Spain, Italy and much of Europe. It moved to green partly to avoid confusion with the Red Cross. _UI:_ a green cross is a sourced, legal health icon that is widely recognized in Europe. **Medium.**
  - https://www.connexionfrance.com/magazine/why-french-pharmacy-crosses-are-always-green/443575
- **Food (India).** Packaged food must carry a green symbol for vegetarian and a brown one for non-vegetarian. _UI:_ in Indian food and delivery apps, a green dot-in-square means vegetarian. Never use that mark as a generic "available" or "online" badge. **High.**
  - https://www.mondaq.com:443/india/corporate-and-company-law/1145070/green-or-brown-an-overview-of-the-fssai39s-labelling-regulations
  - In 2021 FSSAI adopted a filled brown triangle for non-veg because the green and brown dots were hard for color-blind people to tell apart. **Medium** (Wikipedia).
    - https://en.wikipedia.org/wiki/Vegetarian_and_non-vegetarian_marks

### Lightness and saturation

- In the lab, green and blue-green hues were among the most pleasant and also among the more arousing (Valdez & Mehrabian, X6).
- No source documents muted versus bright green carrying distinct cultural meanings.

---

## Blue

- **Widely liked.** Blue was the top favorite in all 10 countries surveyed, including China (X8). **Medium.**
- **India (religion).** Krishna, Vishnu and Rama are depicted blue-skinned, an iconographic sign of divinity (associated with sky, ocean, and rain cloud). **High** (art-history scholarship).
  - https://smarthistory.org/understanding-divine-blueness-in-south-asia
- **Turkey and the eastern Mediterranean (protection).** The blue _nazar_ bead is an amulet against the evil eye, displayed everywhere in Turkey. **High** (university area-studies center).
  - https://crees.ku.edu/nazar
- **Politics.**
  - US: blue = Democrats.
  - South Korea: blue = Democratic Party (center-left).
  - Hong Kong: blue = pro-police/pro-government, from police uniforms.
  - Ukraine 2004: blue = Yanukovych.
  - _UI:_ blue is not politically neutral in charts for these markets.
  - **High** for the US and Hong Kong; **Medium** for Korea.
  - https://fullsite.motherjones.com/?p=204931
  - https://www.csmonitor.com/World/Asia-Pacific/2020/0130/Pocketbook-polarization-In-Hong-Kong-you-are-what-you-buy
  - https://v.daum.net/v/20250525104533083
- **Finance (Korea, Japan).** Blue = price down in Korea and on many Japanese broker displays. _UI:_ in a Korean finance UI, blue is the loss color, not a neutral accent. **Medium.**
  - https://lists.w3.org/Archives/Public/www-international/2005JulSep/0188.html
  - https://retirejapan.com/forum/viewtopic.php?p=38912
- **Mandatory action.** ISO 3864 uses blue for mandatory signs (X9). **Medium.**
- **Gender (US).** Blue for boys and pink for girls only became the US norm around the 1940s. A 1918 trade publication gave the opposite rule. _UI:_ blue/pink gender coding is recent and US/European, and a European Union (EU) data-visualization guide advises against it. **High.**
  - https://www.smithsonianmag.com/history/unraveling-the-colorful-history-of-why-girls-wear-pink-and-boys-wear-blue-1370097/
  - https://data.europa.eu/apps/data-visualisation-guide/colour-connotations
- **Lightness and saturation.** Blue's high valence holds only at high saturation (Wilms & Oberfeld, X7). Dull blues lose the advantage. **High.**

## Navy and indigo (distinct tones)

- **Japan (national identity).** Indigo (ai) is a traditional Japanese color. Tokyo 2020 used indigo ichimatsu checks as "a refined elegance and sophistication that exemplifies Japan." _UI:_ deep indigo reads as traditional and refined in Japan. **High.**
  - https://olympics.com/en/olympic-games/tokyo-2020/logo-design
  - https://www.paralympic.org/news/tokyo-2020-unveils-emblems-2020-games-inspired-traditional-japanese-motif
- **Hong Kong (politics).** The pro-government "blue" label derives from police uniforms (see Blue). **High.**
- No source supports "navy = trust/authority" as a cross-cultural claim. Do not assert it.
- **Lightness and saturation.** No sourced lightness or saturation shift in meaning; apply X6/X7 only.

## Teal and turquoise (distinct tones)

- **Iran and Central Asia (architecture).** Turquoise and cobalt glazed tilework became the defining decoration of Seljuk, Ilkhanid and Timurid religious and secular buildings. _UI:_ turquoise evokes Persian and Islamic architectural heritage. **Medium.** The source supports how common turquoise is, not a specific meaning.
  - https://www.metmuseum.org/art/collection/search/453997
- **Diné (Navajo), US Southwest.** Turquoise is described as the most sacred stone to the Navajo. _UI:_ symbolic context only; no interface convention sourced. **Medium.**
  - https://www.smithsonianmag.com/smithsonian-institution/exquisite-turquoise-more-rare-and-valuable-diamonds-180953420/
- **Mexico (Aztec/Nahua).** The Nahuatl _xihuitl_ means turquoise, and also year and grass. Graded "precious" turquoise had sacred status. _UI:_ symbolic context only; no interface convention sourced. **Medium.**
  - https://aztecglyphs.wired-humanities.org/node/776
- **Lightness and saturation.** No sourced lightness or saturation shift in meaning; apply X6/X7 only.

---

## Purple and violet

- **Rome and Europe (royalty).** Tyrian purple was restricted by sumptuary laws; by the 4th century only the emperor could wear it. Elizabeth I's laws restricted purple to close royal relatives. _UI:_ purple reads regal or luxury in European contexts. **Medium.**
  - https://www.livescience.com/33324-purple-royal-color.html
- **Japan (rank).** Deep purple was the top color in the twelve-level cap-and-rank system of 603. _UI:_ symbolic context only; no interface convention sourced. **Medium.**
  - https://www.onmarkproductions.com/html/17-articles-12-court-ranks.html
- **Japan (neutral formal).** For the cloth used to wrap money gifts (fukusa), purple is appropriate for both celebrations and funerals. _UI:_ purple is a safe formal tone in Japanese ceremonial contexts. **High.**
  - https://www.nippon.com/en/guide-to-japan/gu020005/shugi-and-koden-money-gifts-expressing-congratulations-or-condolences.html
- **Catholic liturgy (Europe, Latin America).** Violet is used for Advent and Lent, and may be used for Masses for the Dead. _UI:_ relevant to church products; in Catholic contexts violet carries penitential and, at times, funerary weight. **High.**
  - https://www.usccb.org/prayer-and-worship/liturgical-year-and-calendar/understanding-the-liturgical-colors
- **Greece (mourning).** Purple is linked to sadness, and dark purple is used in Greek Orthodox mourning periods (X3). _UI:_ dark purple may read as somber for Greek audiences; avoid it for celebratory themes there. **Medium.**
- **Victorian Britain (half-mourning).** Mourning dress progressed from black toward gray and mauve. _UI:_ symbolic context only; no interface convention sourced. **High** (museum).
  - https://www.metmuseum.org/deathbecomesher
- **Women's suffrage, International Women's Day (UK origin, now global).** The suffragettes' Women's Social and Political Union (WSPU) chose purple, green and white in 1908, with purple standing for justice and dignity. Purple is now the most recognized color of International Women's Day. _UI:_ purple is the expected color for International Women's Day campaigns. **Medium.**
  - https://www.scrippsnews.com/us-news/us-history/womens-history-month/the-meaning-behind-women-s-history-month-colors
- **Lightness.** Dark purple carries the mourning and liturgical meanings above; pale lavender and mauve was the softened half-mourning stage. **Medium.**

---

## Pink

- **Shared associations.** Pink is associated with love and pleasure across 30 nations (X2). **High.**
- **US (gender, recent).** See Blue. Pink-for-girls dates from about the 1940s. **High.**
- **EU guidance.** Avoid blue-pink for male-female in charts; it reinforces stereotypes. **High** (official EU guide).
  - https://data.europa.eu/apps/data-visualisation-guide/colour-connotations
- **Japan (erotic connotation of the word).** "Pink film" (pinku eiga) is softcore erotic cinema. _UI:_ "pink" as a content label can connote adult content in Japanese. The hue itself is not taboo. **Medium.**
  - https://en.wikipedia.org/wiki/Pink_film
- **China (politics, internet).** "Little Pink" (小粉红) names young online nationalists. _UI:_ "pink" as a group label can carry this political connotation in Chinese; the hue itself is not affected. **Medium.**
  - https://rsis.edu.sg/rsis-publication/idss/ip21016-the-little-pink-versus-glass-hearts-the-growth-of-cyber-nationalism-in-china-and-the-risk-of-misunderstanding/
  - https://www.scmp.com/news/china/society/article/2095458/rise-little-pink-chinas-young-angry-digital-warriors
- **Mexico (national identity).** _Rosa mexicano_, a vivid purplish pink, was named in 1949 around designer Ramón Valdiosera and promoted as a symbol of Mexican identity. _UI:_ vivid magenta-pink reads as Mexican cultural pride, not gendered, in Mexico. **Medium.**
  - https://mexiconewsdaily.com/culture/the-colors-that-paint-mexico-how-a-nation-found-its-soul-in-every-hue/
  - https://www.unotv.com/estilo-de-vida/moda/ramon-valdiosera-historia-del-disenador-que-creo-el-rosa-mexicano/
- **Lightness and saturation.** No sourced lightness or saturation shift in meaning; apply X6/X7 only.

## Magenta (distinct tone)

- **Trademark (Germany and EU, telecoms).** Deutsche Telekom holds color-mark rights to magenta in telecommunications and has pursued companies in other fields. Lemonade, an insurer, was enjoined in Germany. It then won in France in 2020, where the court found no genuine use of the mark for the contested services. _UI:_ a magenta-led brand palette carries legal risk in Germany and the EU, especially near telecoms. That is a real product pitfall, not a cultural one. **High.**
  - https://techcrunch.com/2019/11/04/lemonade-gets-a-nastygram-from-deutsche-telekom-over-its-use-of-magenta-says-it-will-fight
  - https://archive.techdirt.com/articles/20201217/11481545908/lemonade-beats-deutsche-telekom-french-court-over-use-color-magenta.shtml
- **Mexico.** See rosa mexicano. **Medium.**
- **Lightness and saturation.** No sourced lightness or saturation shift in meaning; apply X6/X7 only.

---

## Brown

- **Germany (politics).** _Braun_ is listed by Duden as meaning "Nazi" (derogatory), from the SA "Brownshirts." _UI:_ calling a product or color _braun_ is ordinary German. The derogatory sense applies only to political or ideological uses ("braune Gesinnung"), so avoid _braun_ when describing groups, movements, or views. The hue itself is fine. **High.**
  - https://www.duden.de/rechtschreibung/braun
  - https://en.wikipedia.org/wiki/Sturmabteilung
- **India (food).** Brown is the mandated non-vegetarian symbol on packaged food (see Green). _UI:_ a brown mark on food reads as non-vegetarian in India. **High.**
  - https://www.mondaq.com:443/india/corporate-and-company-law/1145070/green-or-brown-an-overview-of-the-fssai39s-labelling-regulations
- **Ghana, Akan (mourning).** Kuntunkuni (brown) is one of the three main adinkra funeral-cloth colors. _UI:_ brown can be a mourning color in Ghanaian contexts. **High.**
  - https://www.cooperhewitt.org/2018/09/07/adinkra-message-and-medium/
- **Japan (Edo aesthetics).** Sumptuary laws limited townspeople to sober colors, which produced "48 browns and 100 grays" (shijūhatcha hyakunezumi). That is the root of the _iki_ taste for subtle muted tones. _UI:_ muted browns and grays read as refined, not dull, in Japanese aesthetics. **Medium.**
  - https://honolulumuseum.org/stories-take-a-close-look-at-quiet-luxury-in-kiyonaga-s-rare-painting-86ns
- **Lightness and saturation.** No sourced lightness or saturation shift in meaning; apply X6/X7 only.

---

## Black

- **Europe and North America (mourning).** Black mourning dress was codified in the 19th century; Queen Victoria wore black from 1861 until her death. _UI:_ black or monochrome reads as mourning in Western memorial or condolence UI. **High.**
  - https://www.metmuseum.org/deathbecomesher
- **Japan (funerals).** Black-and-white curtains (kujira-maku) and black-and-white gift cords mark funerals. _UI:_ a black+white pairing reads as condolence in Japan. **High.**
  - https://www.nippon.com/en/guide-to-japan/gu020005/shugi-and-koden-money-gifts-expressing-congratulations-or-condolences.html
- **Shia Islam (Iran and beyond).** During Muharram, black banners, cloths and dress mark mourning for Hussein. _UI:_ black is appropriate for Muharram and Ashura content in Shia contexts; avoid festive palettes there. **High.**
  - https://aljazeera.com/news/2026/6/25/ashura-ceremonies-intertwine-faith-and-support-for-state-in-iran
- **Ghana, Akan.** Brisi (blue-black) is a main funeral-cloth color. "In some families black is worn by the closest family members and in others it is red." _UI:_ black is a mourning color in Ghanaian contexts, but red can be too. **High.**
  - https://www.cooperhewitt.org/2018/09/07/adinkra-message-and-medium/
- **Pan-Arab and Pan-African.**
  - Black is one of the four pan-Arab colors (1916 Arab Revolt flag), associated with the Abbasids.
  - In Garvey's flag, black stands for the people.
  - _UI:_ symbolic context only; no interface convention sourced. **Medium** for pan-Arab; **High** for Garvey.
  - https://flagspot.net/FLAGS/xo-arabc.html
  - https://fiav.org/wp-content/uploads/2021/04/13-12-Crampton-MarcusGarveyAndTheRastaColours.pdf
- **Shared emotion.** Black is the color most associated with sadness across 30 nations (X2). **High.**
- **Food warning (Latin America).** Chile (2016), Peru, Mexico (2020) and others require black octagon "ALTO EN" / "EXCESO" front-of-pack warnings. _UI:_ in Latin American food and grocery UI, a black octagon is a regulated health warning. Don't reuse it as a decorative badge. **High.**
  - https://wgbh.org/news/2016/08/12/chile-battles-obesity-stop-signs-packaged-foods
  - https://obesityevidencehub.org.au/collections/prevention/nutrient-warning-labels
- **Finance (Japan).** Yahoo! Finance Japan showed black for a price rise in 2005, and in Japanese accounting black ink marks surplus as opposed to red-ink deficit. **Medium.**
  - https://lists.w3.org/Archives/Public/www-international/2005JulSep/0191.html
  - https://en.wiktionary.org/wiki/%E8%B5%A4%E5%AD%97
- **Lightness and saturation.** No sourced lightness or saturation shift in meaning; apply X6/X7 only.

---

## White

- **China (mourning).** Traditional mourning clothes are white or undyed coarse hemp, and white flowers and envelopes are used at funerals. Chinese participants link white with sadness more than other nations do (X3). _UI:_ an all-white, flowers-and-white aesthetic can read as funereal in China. Be careful with white-dominant gift, wedding and New Year designs. **High** for the association; **Medium** for specific customs.
  - https://www.technologynetworks.com/neuroscience/news/sadness-is-purple-in-greece-white-in-china-how-people-associate-colors-with-emotions-around-the-340357
  - https://www.theworldofchinese.com/2022/04/how-did-ancient-chinese-mourn-the-deceased/
  - https://rosehills.com/planning-ahead/chinese-traditions
- **Korea (identity and mourning).** Until the 1950s many Koreans wore white hanbok daily. "White-clad people" (baeguiminjok) became a nationalist identity term under Japanese rule, and white is also the traditional mourning color. _UI:_ in Korea white means both identity/purity and mourning. Don't reduce it to "death." **Medium.**
  - https://westminsterresearch.westminster.ac.uk/item/vxw93/the-white-clad-people-the-white-hanbok-and-korean-nationalism
  - https://en.wikipedia.org/wiki/White_clothing_in_Korea
- **Japan (weddings).** Shinto brides wear the all-white _shiromuku_, which symbolizes purity and readiness to take on the new family's "colors." So white is bridal in Japan, not only funereal. **Medium.**
  - https://en.wikipedia.org/wiki/Shinto_wedding
- **India (widowhood and mourning).** In parts of north and central India, widows traditionally wore white and gave up sindoor. White is a long-standing mourning color in Indian traditions, and widows' groups in Nepal have protested the custom. _UI:_ plain white dress imagery can signal widowhood in Hindu South Asian contexts. **Medium.**
  - https://list.indology.info/pipermail/indology/2000-November/024106.html
  - https://www.asianews.it/en/south-asia/nepal/against-hindu-discrimination-widows-wear-dress-in-protest
- **India (weddings, varies).** Kerala Hindu brides wear cream-and-gold kasavu, and Christian brides in India often wear white. **Medium.**
  - https://www.utsavpedia.com/weddings-festivals/the-serene-world-of-marriages-in-gods-own-country-weddings-in-kerala/
- **Islam (burial, pilgrimage).** The dead are shrouded in white (kafan), and Hajj pilgrims wear white ihram. White signifies purity and equality. _UI:_ white carries purity and death connotations in Islamic religious contexts; symbolic context only for general UI. **High.**
  - https://islamicstudies.info/subjects/fiqh/fiqh_us_sunnah/fus4_61.html
- **Europe and North America (weddings).** Queen Victoria's 1840 wedding popularized the white wedding dress. _UI:_ white reads as bridal in Western wedding products, unlike in Chinese contexts (see China above). **High.**
  - https://www.vam.ac.uk/blog/here-come-brides/queen-victoria-and-the-white-wedding-dress
- **Ghana, Akan (celebration).** White adinkra is generally worn to celebrate the living. It may be worn to the funerals of the very elderly, for a life fully lived. _UI:_ white can be celebratory in Ghanaian contexts; do not assume it reads as mourning. **High.**
  - https://www.cooperhewitt.org/2018/09/07/adinkra-message-and-medium/
- **Catholic liturgy.** White is used for Christmas, Easter, and feasts of Mary and the saints. _UI:_ relevant only to church or liturgical-calendar products. **High.**
  - https://www.usccb.org/prayer-and-worship/liturgical-year-and-calendar/understanding-the-liturgical-colors
- **Shared emotion.** White is associated with relief (X2). **High.**
- **Lightness (Japan).** Condolence envelopes are written in pale ink (usuzumi) "symbolizing that tears of sorrow have diluted the writing." Celebratory writing uses deep black. _UI:_ in Japanese condolence contexts, lighter or grayer text is culturally apt, not a contrast error to "fix," though it still must meet accessibility contrast. **High.**
  - https://www.nippon.com/en/guide-to-japan/gu020005/shugi-and-koden-money-gifts-expressing-congratulations-or-condolences.html

---

## Gray

- **China (national mourning UI).** This is a documented interface convention.
  - On the April 4, 2020 national day of mourning for Covid victims, major Chinese apps turned monochrome: Baidu, Taobao, Meituan, Douyin and Kuaishou. Some games went offline.
  - After Jiang Zemin's death in November 2022, government and state-media sites, Taobao, Alipay, Xiaohongshu and McDonald's China went gray.
  - Websites also went black-and-white after the 2022 China Eastern crash.
  - _UI:_ desaturated or grayscale UI in China is an established signal of official mourning. A grayscale skin on a Chinese-market product will read as a mourning gesture.
  - **High.**
  - https://kr-asia.com/chinas-internet-goes-black-and-white-on-day-of-mourning-for-pandemic-victims
  - https://www.taiwannews.com.tw/en/news/4737087
  - https://www.theworldofchinese.com/2022/04/how-did-ancient-chinese-mourn-the-deceased/
- **Japan (Edo aesthetics).** "100 grays" (hyakunezumi): finely distinguished grays became refined fashion under sumptuary laws. _UI:_ muted grays read as refined, not dull, in Japanese aesthetics. **Medium.**
  - https://honolulumuseum.org/stories-take-a-close-look-at-quiet-luxury-in-kiyonaga-s-rare-painting-86ns
- **Victorian half-mourning.** Gray was a step out of full black mourning. _UI:_ symbolic context only; no interface convention sourced. **High.**
  - https://www.metmuseum.org/deathbecomesher
- **Shared emotion.** Gray is associated with sadness, as black is (X2). **High.**
- **Lightness.** Pale gray ink means grief in Japan (see White, usuzumi). In the lab, achromatic colors lowered heart rate briefly, while chromatic colors raised it (Wilms & Oberfeld, X7). **High.**

## Vermilion (distinct tone)

- **India.** Sindoor, vermilion in the hair parting, marks a married Hindu woman. Widows traditionally stop wearing it. _UI:_ vermilion in Indian contexts has a specific marital and religious meaning. **Medium.**
  - https://feminisminindia.com/2017/08/07/sindoor-symbol-marriage-patriarchy/
  - https://www.asianews.it/en/south-asia/nepal/against-hindu-discrimination-widows-wear-dress-in-protest
- **Korea.** Red name stamps (dojang) are the accepted exception to the taboo on red-ink names. _UI:_ a red seal or stamp graphic is acceptable in Korea, unlike a red-ink name. **Medium.**
  - https://gwangjunewsgic.com/arts-culture/korean-myths/behind-the-myth-the-red-pen/
- No source was found for vermilion's meaning in Japanese shrine architecture or Chinese imperial edicts. Do not assert it.
- **Lightness and saturation.** No sourced lightness or saturation shift in meaning; apply X6/X7 only.

---

## Documented real-product pitfalls (summary)

| Pitfall                                           | Region         | What happened                                                                                                                                                                                   | Source                                                                                                                              |
| ------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Red cross health icons                            | Global         | Among Us recolored its health canisters red to blue; Prison Architect recolored to green; Halo, Left 4 Dead and Fallout changed too. LEGO switched to a white-on-red cross or the Star of Life. | https://opiniojuris.org/2026/08/20/from-medkits-to-punk-rock-pop-culture-and-the-non-negotiable-protection-of-the-red-cross-emblem/ |
| Magenta color trademark                           | Germany, EU    | Deutsche Telekom got an injunction against Lemonade in Germany. Lemonade won in France in 2020.                                                                                                 | https://techcrunch.com/2019/11/04/lemonade-gets-a-nastygram-from-deutsche-telekom-over-its-use-of-magenta-says-it-will-fight        |
| Veg/non-veg marks unreadable to color-blind users | India          | FSSAI changed the non-veg mark to a brown triangle in 2021 because the green and brown dots relied on color alone (Medium).                                                                     | https://en.wikipedia.org/wiki/Vegetarian_and_non-vegetarian_marks                                                                   |
| Recolored blood no longer passes                  | Mainland China | The 2019 rules ban blood of any color. PUBG's China version removed its blue blood entirely.                                                                                                    | https://globalvoices.org/2019/05/10/tencents-new-game-shows-how-censorship-rules-are-implemented-in-china                           |
| Mourning-day grayscale                            | Mainland China | Major apps went monochrome in 2020 and 2022; some games suspended service on April 4, 2020.                                                                                                     | https://kr-asia.com/chinas-internet-goes-black-and-white-on-day-of-mourning-for-pandemic-victims                                    |
| Stock color direction                             | East Asia      | Japanese brokers and apps offer red/green toggles. A 2005 locale proposal sought an LC_STOCK_COLOR setting.                                                                                     | https://retirejapan.com/forum/viewtopic.php?p=38912 ; https://lists.w3.org/Archives/Public/www-international/2005JulSep/0188.html   |

---

## Safe generalizations

1. Most color-emotion associations are shared worldwide; local differences sit on top of a common base (X1). High.
2. Red is associated with love and anger, black and gray with sadness, yellow with joy (except among Egyptian participants), and pink with love (X2). High.
3. Brightness and saturation matter more than hue for emotional tone. Vivid means more arousing, brighter means more pleasant (X6, X7). High.
4. Red for error or danger is defensible across cultures, including China, where the association is weaker but not reversed (X4, X9). Always add an icon and text (X10). High.
5. Finance gain/loss colors are the one widely documented regional _inversion_. Make them a locale default plus a user setting, and always add +/- or arrows. High.
6. Blue is the most-liked color across the countries surveyed (X8). Medium.
7. A red cross is never a free icon anywhere. High.
8. Mourning colors vary:
   - Black in Europe and North America.
   - White in China and Korea, and for Hindu widows.
   - Black-and-white in Japan.
   - Red, black or brown among the Akan in Ghana.
   - Black in Shia Muharram.
   - Dark purple in Greek Orthodoxy.
   - Any description of a "somber" color should name which tradition it means. Mixed confidence: High for Western black, Japanese black-and-white, the Chinese white association, Akan, and Shia black; Medium for Korean white, Hindu widows' white, and Greek purple.

## Claims to avoid (stereotyped, overgeneralized, or poorly sourced)

- **"Yellow is taboo or pornographic in China."** The sense belongs to the word 黄, not the hue. Chinese brands use yellow freely.
- **"Green is unlucky in China" or "green means illness in China."** The cuckold sense is the green _hat_. "Green = illness" appeared only as one unsourced aside in the EU guide.
- **"OPPO dropped green because of the green-hat taboo."** OPPO said "better brand image"; no source ties it to hats.
- **"Japan uses red for rising stocks" stated as universal.** Japan is mixed, as is Hong Kong.
- **"Red means good luck, so use red for success states in China."** Experimental evidence shows red-negative still holds, only more weakly (X4).
- **"White is the color of death in Asia."** It is too broad:
  - In Japan, white is also the Shinto bridal color.
  - In Korea, it was everyday national dress.
  - Among the Akan in Ghana, white is for celebrations.
- **"Red is the Indian bridal color."** True for much of North India; not for Kerala, Christian Indian, or many other communities.
- **"Purple is the mourning color in Brazil / Thailand."** These come only from funeral-industry blogs and listicles. Drop them.
- **"Red is the mourning color in South Africa."** Listicle claim; no credible source found.
- **"Pepsi lost Southeast Asian market share by changing to light blue."** A recycled marketing anecdote with no primary source.
- **"Africa" as one color culture.** Sourced material covers only Ghana (Akan, Asante) and Ethiopia/pan-African flags. Per-color "kente meaning" lists are inconsistent and commercial.
- **"Navy means trust."** No cross-cultural source.
- **"Turquoise means heaven in Persian architecture."** Sources support how common it is, not that meaning.
- **"Black means fertility (ancient Egypt)."** Source was a tour portal, and the claim is irrelevant to modern UI.
- **Vietnamese color claims.** Only listicle sources found; omitted.
- **"Red torii = vermilion symbolism" and "imperial vermilion edicts."** Not sourced in this research.
- **Regional banking, sale/discount, and non-Western gender color conventions.** Nothing credible found. Do not infer.
