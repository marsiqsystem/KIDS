/**
 * ⚠️ DUMMY PAPERS — FOR THE TEST EXAM ONLY. NOT THE REAL SET 2026 PAPER.
 *
 * These four 50-question papers exist so the whole exam machinery (start, save,
 * resume, auto-submit, score, finalise) can be driven end to end with the real
 * paper shape — 50 questions, a 50-long key, class-wise IDs — before the real
 * questions arrive. Every question here is a genuine, checkable General Knowledge
 * fact, but NONE of it has been approved by an examiner.
 *
 * They are deliberately kept DOUBLY GATED. `getPaper()` returns these only for a
 * REHEARSAL window (an is_demo account on an explicit UID allowlist) AND only
 * when `KIDS_DUMMY_PAPERS=1` is set. The real 19-July path can never reach them,
 * so even with the flag left on, a real student's paper resolves to null and the
 * API fails loudly, exactly as designed. When the real questions come, replace
 * the contents of this file; the loud-failure guarantee is never spent.
 *
 * SERVER ONLY, like papers.ts: this module holds answer keys.
 */
import type { Paper } from "./papers";
import { EXAM } from "./config.ts";

/** A question with its answer attached, so the key can never drift from the paper. */
type Keyed = { context?: string; q: string; options: string[]; answer: number };

/** Strip the answer into a separate key, producing a real Paper. */
function toPaper(id: string, qs: Keyed[]): Paper {
  if (qs.length !== EXAM.questionCount) {
    throw new Error(`${id}: expected ${EXAM.questionCount} questions, got ${qs.length}`);
  }
  for (const [i, x] of qs.entries()) {
    if (x.answer < 0 || x.answer >= x.options.length) {
      throw new Error(`${id} q${i}: answer index ${x.answer} out of range`);
    }
  }
  return {
    id,
    questions: qs.map(({ context, q, options }) => ({ context, q, options })),
    key: qs.map((x) => x.answer),
  };
}

// ---------------------------------------------------------------------------
// Class IX — general knowledge, foundational
// ---------------------------------------------------------------------------
const IX: Keyed[] = [
  { q: "Who was the first Prime Minister of India?", options: ["Sardar Patel", "Jawaharlal Nehru", "Rajendra Prasad", "Mahatma Gandhi"], answer: 1 },
  { q: "Which is the largest planet in our solar system?", options: ["Saturn", "Earth", "Jupiter", "Neptune"], answer: 2 },
  { q: "The Taj Mahal is located in which city?", options: ["Delhi", "Jaipur", "Agra", "Lucknow"], answer: 2 },
  { q: "How many continents are there on Earth?", options: ["five", "six", "seven", "eight"], answer: 2 },
  { q: "Which gas do plants absorb from the air for photosynthesis?", options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], answer: 2 },
  { q: "Who wrote the Indian national anthem 'Jana Gana Mana'?", options: ["Bankim Chandra Chatterjee", "Rabindranath Tagore", "Sarojini Naidu", "Muhammad Iqbal"], answer: 1 },
  { q: "Which is the longest river in the world?", options: ["Amazon", "Nile", "Ganga", "Yangtze"], answer: 1 },
  { q: "The Great Wall is located in which country?", options: ["Japan", "India", "China", "Mongolia"], answer: 2 },
  { q: "How many players are there in a cricket team on the field?", options: ["nine", "ten", "eleven", "twelve"], answer: 2 },
  { q: "Which is the national animal of India?", options: ["Lion", "Elephant", "Tiger", "Leopard"], answer: 2 },
  { q: "What is the chemical symbol for water?", options: ["CO2", "H2O", "O2", "NaCl"], answer: 1 },
  { q: "Which festival is known as the 'festival of lights'?", options: ["Holi", "Eid", "Diwali", "Onam"], answer: 2 },
  { q: "The Sun rises in which direction?", options: ["West", "North", "South", "East"], answer: 3 },
  { q: "Who is known as the 'Father of the Nation' in India?", options: ["Bhagat Singh", "Mahatma Gandhi", "Subhas Chandra Bose", "B. R. Ambedkar"], answer: 1 },
  { q: "Which is the smallest state in India by area?", options: ["Sikkim", "Tripura", "Goa", "Nagaland"], answer: 2 },
  { q: "How many colours are there in a rainbow?", options: ["five", "six", "seven", "eight"], answer: 2 },
  { q: "Which organ pumps blood through the human body?", options: ["Lungs", "Liver", "Heart", "Kidney"], answer: 2 },
  { q: "The currency of Japan is the __", options: ["Yuan", "Won", "Yen", "Ringgit"], answer: 2 },
  { q: "Which metal is liquid at room temperature?", options: ["Iron", "Mercury", "Copper", "Aluminium"], answer: 1 },
  { q: "Mount Everest lies in which mountain range?", options: ["Andes", "Alps", "Himalayas", "Rockies"], answer: 2 },
  { q: "Which is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], answer: 3 },
  { q: "The freezing point of water is __ degrees Celsius.", options: ["0", "10", "32", "100"], answer: 0 },
  { q: "Who invented the electric bulb?", options: ["Isaac Newton", "Thomas Edison", "Albert Einstein", "Graham Bell"], answer: 1 },
  { q: "Which planet is known as the 'Red Planet'?", options: ["Venus", "Mars", "Mercury", "Jupiter"], answer: 1 },
  { q: "The Statue of Liberty was gifted to the USA by which country?", options: ["Britain", "Germany", "France", "Italy"], answer: 2 },
  { q: "How many days are there in a leap year?", options: ["364", "365", "366", "367"], answer: 2 },
  { q: "Which vitamin do we get from sunlight?", options: ["Vitamin A", "Vitamin B", "Vitamin C", "Vitamin D"], answer: 3 },
  { q: "The national flower of India is the __", options: ["Rose", "Lotus", "Sunflower", "Marigold"], answer: 1 },
  { q: "Which is the fastest land animal?", options: ["Lion", "Horse", "Cheetah", "Leopard"], answer: 2 },
  { q: "The Eiffel Tower is in which city?", options: ["London", "Rome", "Paris", "Berlin"], answer: 2 },
  { q: "Which is the hardest natural substance?", options: ["Gold", "Iron", "Diamond", "Quartz"], answer: 2 },
  { q: "How many bones are there in the adult human body?", options: ["106", "206", "306", "406"], answer: 1 },
  { q: "Which country is known as the 'Land of the Rising Sun'?", options: ["China", "Thailand", "Japan", "Korea"], answer: 2 },
  { q: "The process by which plants make their food is called __", options: ["Respiration", "Digestion", "Photosynthesis", "Transpiration"], answer: 2 },
  { q: "Who painted the Mona Lisa?", options: ["Pablo Picasso", "Vincent van Gogh", "Leonardo da Vinci", "Michelangelo"], answer: 2 },
  { q: "Which is the largest desert in the world?", options: ["Thar", "Gobi", "Kalahari", "Sahara"], answer: 3 },
  { q: "The human body has how many pairs of lungs? (total lungs)", options: ["one", "two", "three", "four"], answer: 1 },
  { q: "Which is the national bird of India?", options: ["Parrot", "Peacock", "Sparrow", "Eagle"], answer: 1 },
  { q: "What does the 'www' in a website address stand for?", options: ["World Web Wide", "World Wide Web", "Web World Wide", "Wide World Web"], answer: 1 },
  { q: "Which river is considered the holiest in India?", options: ["Yamuna", "Godavari", "Ganga", "Narmada"], answer: 2 },
  { q: "The boiling point of water at sea level is __ degrees Celsius.", options: ["50", "90", "100", "120"], answer: 2 },
  { q: "Which is the closest planet to the Sun?", options: ["Venus", "Earth", "Mercury", "Mars"], answer: 2 },
  { q: "How many sides does a hexagon have?", options: ["five", "six", "seven", "eight"], answer: 1 },
  { q: "The Pyramids of Giza are located in which country?", options: ["Greece", "Egypt", "Iraq", "Iran"], answer: 1 },
  { q: "Which of these is a mammal?", options: ["Shark", "Whale", "Crocodile", "Octopus"], answer: 1 },
  { q: "The number of primary colours in light is __", options: ["two", "three", "four", "five"], answer: 1 },
  { q: "Which instrument is used to measure temperature?", options: ["Barometer", "Thermometer", "Speedometer", "Odometer"], answer: 1 },
  { q: "Who discovered gravity when an apple fell?", options: ["Galileo", "Newton", "Einstein", "Copernicus"], answer: 1 },
  { q: "Which is the largest mammal in the world?", options: ["Elephant", "Blue whale", "Giraffe", "Hippopotamus"], answer: 1 },
  { q: "The capital of India is __", options: ["Mumbai", "Kolkata", "New Delhi", "Chennai"], answer: 2 },
];

// ---------------------------------------------------------------------------
// Class X — general knowledge, moderate
// ---------------------------------------------------------------------------
const X: Keyed[] = [
  { q: "In which year did India gain independence?", options: ["1945", "1947", "1950", "1942"], answer: 1 },
  { q: "Who was the first President of India?", options: ["Rajendra Prasad", "S. Radhakrishnan", "Zakir Husain", "V. V. Giri"], answer: 0 },
  { q: "Which acid is found in the human stomach?", options: ["Sulphuric acid", "Nitric acid", "Hydrochloric acid", "Acetic acid"], answer: 2 },
  { q: "The Constitution of India came into effect on __", options: ["15 August 1947", "26 January 1950", "26 November 1949", "2 October 1948"], answer: 1 },
  { q: "Which is the powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondria", "Chloroplast"], answer: 2 },
  { q: "Who wrote the play 'Romeo and Juliet'?", options: ["Charles Dickens", "William Shakespeare", "John Milton", "George Orwell"], answer: 1 },
  { q: "Which planet has the most prominent rings?", options: ["Jupiter", "Saturn", "Uranus", "Neptune"], answer: 1 },
  { q: "The speed of light is approximately __ km per second.", options: ["3,000", "30,000", "300,000", "3,000,000"], answer: 2 },
  { q: "Which is the largest gland in the human body?", options: ["Pancreas", "Thyroid", "Liver", "Adrenal"], answer: 2 },
  { q: "The 'Jallianwala Bagh massacre' took place in which city?", options: ["Lahore", "Amritsar", "Delhi", "Kanpur"], answer: 1 },
  { q: "Which country has the largest population in the world (2023 onwards)?", options: ["China", "USA", "India", "Indonesia"], answer: 2 },
  { q: "The chemical symbol 'Na' stands for which element?", options: ["Nickel", "Nitrogen", "Sodium", "Neon"], answer: 2 },
  { q: "Who is known as the 'Missile Man of India'?", options: ["Vikram Sarabhai", "A. P. J. Abdul Kalam", "Homi Bhabha", "C. V. Raman"], answer: 1 },
  { q: "Which is the smallest bone in the human body?", options: ["Stapes", "Femur", "Radius", "Tibia"], answer: 0 },
  { q: "The Suez Canal connects the Mediterranean Sea to the __", options: ["Black Sea", "Red Sea", "Caspian Sea", "Arabian Sea"], answer: 1 },
  { q: "How many fundamental rights are guaranteed by the Indian Constitution?", options: ["five", "six", "seven", "eight"], answer: 1 },
  { q: "Which vitamin is essential for blood clotting?", options: ["Vitamin A", "Vitamin C", "Vitamin K", "Vitamin E"], answer: 2 },
  { q: "The 'Dandi March' was led by Mahatma Gandhi in which year?", options: ["1919", "1930", "1942", "1920"], answer: 1 },
  { q: "Which gas is most abundant in the Earth's atmosphere?", options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Argon"], answer: 2 },
  { q: "Who invented the telephone?", options: ["Thomas Edison", "Alexander Graham Bell", "Nikola Tesla", "Guglielmo Marconi"], answer: 1 },
  { q: "The largest continent by area is __", options: ["Africa", "Asia", "Europe", "North America"], answer: 1 },
  { q: "Which part of the plant conducts photosynthesis mainly?", options: ["Root", "Stem", "Leaf", "Flower"], answer: 2 },
  { q: "The 'Battle of Plassey' was fought in which year?", options: ["1757", "1764", "1857", "1707"], answer: 0 },
  { q: "What is the SI unit of electric current?", options: ["Volt", "Watt", "Ampere", "Ohm"], answer: 2 },
  { q: "Which is the tallest mountain peak in the world?", options: ["K2", "Kangchenjunga", "Mount Everest", "Makalu"], answer: 2 },
  { q: "The headquarters of the United Nations is in which city?", options: ["Geneva", "New York", "Paris", "London"], answer: 1 },
  { q: "Which blood group is known as the universal donor?", options: ["A", "B", "AB", "O negative"], answer: 3 },
  { q: "Who discovered the law of gravitation?", options: ["Albert Einstein", "Isaac Newton", "Galileo Galilei", "Johannes Kepler"], answer: 1 },
  { q: "The Rowlatt Act was passed in which year?", options: ["1919", "1909", "1929", "1935"], answer: 0 },
  { q: "Which is the longest bone in the human body?", options: ["Humerus", "Femur", "Tibia", "Fibula"], answer: 1 },
  { q: "The study of living organisms is called __", options: ["Geology", "Botany", "Biology", "Zoology"], answer: 2 },
  { q: "Which river is known as the 'Sorrow of Bengal'?", options: ["Hooghly", "Damodar", "Teesta", "Mahananda"], answer: 1 },
  { q: "The chemical formula for common salt is __", options: ["KCl", "NaCl", "CaCO3", "NaHCO3"], answer: 1 },
  { q: "Who was the first woman Prime Minister of India?", options: ["Sarojini Naidu", "Indira Gandhi", "Pratibha Patil", "Sonia Gandhi"], answer: 1 },
  { q: "Which planet is known as the 'Morning Star' or 'Evening Star'?", options: ["Mars", "Venus", "Mercury", "Jupiter"], answer: 1 },
  { q: "The process of converting water vapour into liquid is called __", options: ["Evaporation", "Condensation", "Sublimation", "Freezing"], answer: 1 },
  { q: "Which Mughal emperor built the Taj Mahal?", options: ["Akbar", "Jahangir", "Shah Jahan", "Aurangzeb"], answer: 2 },
  { q: "The SI unit of force is the __", options: ["Joule", "Newton", "Pascal", "Watt"], answer: 1 },
  { q: "Which is the largest coral reef system in the world?", options: ["Red Sea Reef", "Great Barrier Reef", "Maldives Reef", "Andaman Reef"], answer: 1 },
  { q: "Who wrote the book 'The Discovery of India'?", options: ["Mahatma Gandhi", "Jawaharlal Nehru", "B. R. Ambedkar", "Sardar Patel"], answer: 1 },
  { q: "Which disease is caused by a deficiency of vitamin C?", options: ["Rickets", "Scurvy", "Beriberi", "Night blindness"], answer: 1 },
  { q: "The first satellite launched by India was named __", options: ["Bhaskara", "Rohini", "Aryabhata", "INSAT"], answer: 2 },
  { q: "Which is the national aquatic animal of India?", options: ["Blue whale", "Gangetic dolphin", "Sea turtle", "Crocodile"], answer: 1 },
  { q: "The Berlin Wall fell in which year?", options: ["1985", "1989", "1991", "1993"], answer: 1 },
  { q: "Which instrument measures atmospheric pressure?", options: ["Thermometer", "Barometer", "Hygrometer", "Anemometer"], answer: 1 },
  { q: "The 'Quit India Movement' began in which year?", options: ["1930", "1935", "1942", "1945"], answer: 2 },
  { q: "Which element has the atomic number 1?", options: ["Helium", "Hydrogen", "Oxygen", "Carbon"], answer: 1 },
  { q: "The Andaman and Nicobar Islands are located in which body of water?", options: ["Arabian Sea", "Bay of Bengal", "Indian Ocean", "Laccadive Sea"], answer: 1 },
  { q: "Who is credited with the discovery of penicillin?", options: ["Louis Pasteur", "Alexander Fleming", "Robert Koch", "Edward Jenner"], answer: 1 },
  { q: "The largest democracy in the world is __", options: ["USA", "India", "Brazil", "Indonesia"], answer: 1 },
];

// ---------------------------------------------------------------------------
// Class XI — general knowledge, higher
// ---------------------------------------------------------------------------
const XI: Keyed[] = [
  { q: "Who is regarded as the 'Father of Economics'?", options: ["John Maynard Keynes", "Adam Smith", "David Ricardo", "Karl Marx"], answer: 1 },
  { q: "The 'Preamble' of the Indian Constitution was inspired by which country's constitution?", options: ["Britain", "USA", "France", "Canada"], answer: 1 },
  { q: "Which scientist proposed the theory of relativity?", options: ["Isaac Newton", "Albert Einstein", "Niels Bohr", "Max Planck"], answer: 1 },
  { q: "The largest gland in the endocrine system is the __", options: ["Pituitary", "Thyroid", "Adrenal", "Pancreas"], answer: 1 },
  { q: "Which Article of the Indian Constitution deals with the Right to Equality?", options: ["Article 14", "Article 19", "Article 21", "Article 32"], answer: 0 },
  { q: "The 'Renaissance' began in which country?", options: ["France", "England", "Italy", "Germany"], answer: 2 },
  { q: "Which law states that pressure and volume of a gas are inversely proportional at constant temperature?", options: ["Charles's Law", "Boyle's Law", "Avogadro's Law", "Gay-Lussac's Law"], answer: 1 },
  { q: "Who wrote 'The Wealth of Nations'?", options: ["Karl Marx", "Adam Smith", "John Locke", "Thomas Hobbes"], answer: 1 },
  { q: "The powerhouse molecule that stores energy in cells is __", options: ["DNA", "RNA", "ATP", "Glucose"], answer: 2 },
  { q: "Which Indian city is known as the 'Silicon Valley of India'?", options: ["Hyderabad", "Pune", "Bengaluru", "Chennai"], answer: 2 },
  { q: "The French Revolution began in which year?", options: ["1776", "1789", "1799", "1804"], answer: 1 },
  { q: "Which planet has the shortest day (fastest rotation)?", options: ["Earth", "Mars", "Jupiter", "Venus"], answer: 2 },
  { q: "The pH value of a neutral solution is __", options: ["0", "7", "10", "14"], answer: 1 },
  { q: "Who founded the Mauryan Empire?", options: ["Ashoka", "Bindusara", "Chandragupta Maurya", "Bimbisara"], answer: 2 },
  { q: "The unit of electrical resistance is the __", options: ["Ampere", "Volt", "Ohm", "Watt"], answer: 2 },
  { q: "Which organ produces insulin in the human body?", options: ["Liver", "Pancreas", "Kidney", "Spleen"], answer: 1 },
  { q: "The 'Magna Carta' was signed in which country?", options: ["France", "England", "Spain", "Germany"], answer: 1 },
  { q: "Which is the second most abundant element in the Earth's crust?", options: ["Oxygen", "Silicon", "Aluminium", "Iron"], answer: 1 },
  { q: "The theory of natural selection was proposed by __", options: ["Gregor Mendel", "Charles Darwin", "Jean-Baptiste Lamarck", "Louis Pasteur"], answer: 1 },
  { q: "How many members are there in the Lok Sabha (maximum sanctioned strength)?", options: ["500", "543", "552", "600"], answer: 2 },
  { q: "Which country is called the 'Roof of the World'?", options: ["Nepal", "Tibet", "Bhutan", "Switzerland"], answer: 1 },
  { q: "The chemical name of baking soda is __", options: ["Sodium chloride", "Sodium bicarbonate", "Calcium carbonate", "Sodium hydroxide"], answer: 1 },
  { q: "Who is known as the 'Napoleon of India'?", options: ["Chandragupta Maurya", "Samudragupta", "Ashoka", "Harshavardhana"], answer: 1 },
  { q: "The SI unit of energy is the __", options: ["Newton", "Watt", "Joule", "Pascal"], answer: 2 },
  { q: "Which vitamin is also known as ascorbic acid?", options: ["Vitamin A", "Vitamin B12", "Vitamin C", "Vitamin D"], answer: 2 },
  { q: "The 'Cold War' was primarily between the USA and which country?", options: ["China", "Germany", "Soviet Union", "Japan"], answer: 2 },
  { q: "Which gas is responsible for the greenhouse effect the most (by contribution)?", options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"], answer: 1 },
  { q: "The author of the Indian Constitution's drafting committee was __", options: ["Jawaharlal Nehru", "B. R. Ambedkar", "Rajendra Prasad", "Sardar Patel"], answer: 1 },
  { q: "Which is the largest artery in the human body?", options: ["Pulmonary artery", "Aorta", "Carotid artery", "Femoral artery"], answer: 1 },
  { q: "The 'Battle of Waterloo' resulted in the defeat of __", options: ["Hitler", "Napoleon", "Julius Caesar", "Alexander"], answer: 1 },
  { q: "Which metal is the best conductor of electricity?", options: ["Copper", "Gold", "Silver", "Aluminium"], answer: 2 },
  { q: "The Gupta period is often called the 'Golden Age' of which country?", options: ["China", "India", "Persia", "Greece"], answer: 1 },
  { q: "Newton's first law of motion is also called the law of __", options: ["Acceleration", "Inertia", "Action-reaction", "Momentum"], answer: 1 },
  { q: "Which international organisation awards the Nobel Peace Prize?", options: ["United Nations", "Norwegian Nobel Committee", "Swedish Academy", "Red Cross"], answer: 1 },
  { q: "The 'Green Revolution' in India is associated with which crop primarily?", options: ["Cotton", "Wheat", "Tea", "Jute"], answer: 1 },
  { q: "Which acid is present in vinegar?", options: ["Citric acid", "Acetic acid", "Lactic acid", "Formic acid"], answer: 1 },
  { q: "Who propounded the 'Quantum Theory'?", options: ["Albert Einstein", "Max Planck", "Niels Bohr", "Werner Heisenberg"], answer: 1 },
  { q: "The Rajya Sabha is also known as the __", options: ["House of the People", "Council of States", "Lower House", "Legislative Assembly"], answer: 1 },
  { q: "Which continent is entirely in the Southern Hemisphere?", options: ["Africa", "Australia", "Asia", "Europe"], answer: 1 },
  { q: "The number of chromosomes in a normal human cell is __", options: ["23", "44", "46", "48"], answer: 2 },
  { q: "Which mughal ruler introduced 'Din-i-Ilahi'?", options: ["Babur", "Akbar", "Jahangir", "Shah Jahan"], answer: 1 },
  { q: "The SI unit of power is the __", options: ["Joule", "Watt", "Newton", "Ampere"], answer: 1 },
  { q: "Which river is the longest in India?", options: ["Yamuna", "Brahmaputra", "Ganga", "Godavari"], answer: 2 },
  { q: "The 'Doctrine of Lapse' was introduced by __", options: ["Lord Curzon", "Lord Dalhousie", "Lord Wellesley", "Warren Hastings"], answer: 1 },
  { q: "Which element is essential for the thyroid gland to function?", options: ["Iron", "Iodine", "Calcium", "Zinc"], answer: 1 },
  { q: "The World Trade Organisation (WTO) is headquartered in __", options: ["New York", "Geneva", "Paris", "Vienna"], answer: 1 },
  { q: "Which is the smallest prime number?", options: ["0", "1", "2", "3"], answer: 2 },
  { q: "The 'Sepoy Mutiny' or first war of independence occurred in __", options: ["1757", "1857", "1885", "1905"], answer: 1 },
  { q: "Photosynthesis primarily occurs in which cell organelle?", options: ["Mitochondria", "Chloroplast", "Nucleus", "Ribosome"], answer: 1 },
  { q: "Which country hosted the first modern Olympic Games in 1896?", options: ["France", "Greece", "England", "USA"], answer: 1 },
];

// ---------------------------------------------------------------------------
// Class XII — general knowledge, advanced
// ---------------------------------------------------------------------------
const XII: Keyed[] = [
  { q: "Who was the Governor-General of India during the Revolt of 1857?", options: ["Lord Dalhousie", "Lord Canning", "Lord Mountbatten", "Lord Ripon"], answer: 1 },
  { q: "The Heisenberg Uncertainty Principle relates to the position and __ of a particle.", options: ["mass", "charge", "momentum", "spin"], answer: 2 },
  { q: "Which Article of the Indian Constitution abolishes untouchability?", options: ["Article 15", "Article 17", "Article 19", "Article 21"], answer: 1 },
  { q: "The 'Manhattan Project' was associated with the development of the __", options: ["Space shuttle", "Atomic bomb", "Internet", "Radar"], answer: 1 },
  { q: "Who wrote 'Das Kapital'?", options: ["Adam Smith", "Karl Marx", "Friedrich Engels", "Max Weber"], answer: 1 },
  { q: "The enzyme that breaks down starch in the mouth is __", options: ["Pepsin", "Amylase", "Trypsin", "Lipase"], answer: 1 },
  { q: "Which physicist received the Nobel Prize for the photoelectric effect?", options: ["Max Planck", "Albert Einstein", "Niels Bohr", "Erwin Schrödinger"], answer: 1 },
  { q: "The 'Bretton Woods' conference led to the creation of the IMF and the __", options: ["WTO", "World Bank", "United Nations", "NATO"], answer: 1 },
  { q: "Which Indian mathematician is known for his work on infinite series and number theory?", options: ["Aryabhata", "Srinivasa Ramanujan", "Brahmagupta", "Bhaskara"], answer: 1 },
  { q: "The 'Treaty of Versailles' formally ended which war?", options: ["World War II", "World War I", "Franco-Prussian War", "Crimean War"], answer: 1 },
  { q: "Which law of thermodynamics introduces the concept of entropy?", options: ["Zeroth law", "First law", "Second law", "Third law"], answer: 2 },
  { q: "The DNA double-helix structure was discovered by Watson and __", options: ["Franklin", "Crick", "Wilkins", "Chargaff"], answer: 1 },
  { q: "Which Constitutional Amendment added the words 'Socialist' and 'Secular' to the Preamble?", options: ["24th", "42nd", "44th", "52nd"], answer: 1 },
  { q: "The 'Bhakti Movement' emphasised devotion to __", options: ["ritual sacrifice", "a personal god", "caste hierarchy", "military conquest"], answer: 1 },
  { q: "Which particle carries a negative electric charge?", options: ["Proton", "Neutron", "Electron", "Positron"], answer: 2 },
  { q: "The concept of 'Purchasing Power Parity' is used in the study of __", options: ["Biology", "Economics", "Geology", "Astronomy"], answer: 1 },
  { q: "Who is regarded as the 'Father of the Indian Constitution'?", options: ["Jawaharlal Nehru", "B. R. Ambedkar", "Mahatma Gandhi", "Rajendra Prasad"], answer: 1 },
  { q: "The 'Doppler effect' is commonly observed with which kind of wave?", options: ["Only light waves", "Only water waves", "Sound and light waves", "Only radio waves"], answer: 2 },
  { q: "Which empire was ruled by Emperor Ashoka?", options: ["Gupta", "Maurya", "Chola", "Mughal"], answer: 1 },
  { q: "The chemical process of rusting of iron is an example of __", options: ["Reduction", "Oxidation", "Sublimation", "Neutralisation"], answer: 1 },
  { q: "Which body regulates monetary policy in India?", options: ["SEBI", "Reserve Bank of India", "NITI Aayog", "Finance Ministry"], answer: 1 },
  { q: "The 'Salt Satyagraha' of 1930 was aimed at protesting the British __", options: ["land tax", "salt tax", "income tax", "trade tariff"], answer: 1 },
  { q: "Which gas law states that equal volumes of gases contain equal numbers of molecules?", options: ["Boyle's Law", "Charles's Law", "Avogadro's Law", "Dalton's Law"], answer: 2 },
  { q: "The 'Iron Curtain' speech was delivered by __", options: ["Franklin Roosevelt", "Winston Churchill", "Joseph Stalin", "Harry Truman"], answer: 1 },
  { q: "Which vitamin deficiency causes rickets?", options: ["Vitamin A", "Vitamin C", "Vitamin D", "Vitamin K"], answer: 2 },
  { q: "The 'Panchsheel Agreement' was signed between India and __", options: ["Pakistan", "China", "Nepal", "Sri Lanka"], answer: 1 },
  { q: "Which fundamental force is responsible for holding the nucleus of an atom together?", options: ["Gravitational force", "Electromagnetic force", "Strong nuclear force", "Weak nuclear force"], answer: 2 },
  { q: "The economist who wrote 'The General Theory of Employment, Interest and Money' was __", options: ["Adam Smith", "John Maynard Keynes", "Milton Friedman", "David Ricardo"], answer: 1 },
  { q: "Which Indian ruler is associated with the 'Vijayanagara Empire' at its peak?", options: ["Krishnadevaraya", "Rajaraja Chola", "Prithviraj Chauhan", "Sher Shah Suri"], answer: 0 },
  { q: "The SI unit of magnetic flux is the __", options: ["Tesla", "Weber", "Henry", "Gauss"], answer: 1 },
  { q: "Which movement was launched by Mahatma Gandhi in 1920?", options: ["Civil Disobedience", "Non-Cooperation", "Quit India", "Khilafat"], answer: 1 },
  { q: "The largest lymphatic organ in the human body is the __", options: ["Thymus", "Spleen", "Tonsil", "Liver"], answer: 1 },
  { q: "Which scientist formulated the periodic law and the periodic table?", options: ["John Dalton", "Dmitri Mendeleev", "Antoine Lavoisier", "Ernest Rutherford"], answer: 1 },
  { q: "The 'Non-Aligned Movement' was co-founded by India's __", options: ["Indira Gandhi", "Jawaharlal Nehru", "Lal Bahadur Shastri", "Rajiv Gandhi"], answer: 1 },
  { q: "Which process describes the splitting of a heavy nucleus into lighter ones?", options: ["Nuclear fusion", "Nuclear fission", "Radioactive decay", "Ionisation"], answer: 1 },
  { q: "The 'invisible hand' is a concept associated with which economist?", options: ["Karl Marx", "Adam Smith", "John Keynes", "Amartya Sen"], answer: 1 },
  { q: "Which Indian won the Nobel Prize in Literature in 1913?", options: ["Rabindranath Tagore", "Amartya Sen", "C. V. Raman", "Mother Teresa"], answer: 0 },
  { q: "The mitochondrial DNA is inherited from which parent?", options: ["Father", "Mother", "Both equally", "Neither"], answer: 1 },
  { q: "Which amendment is known as the 'Mini Constitution' of India?", options: ["42nd Amendment", "44th Amendment", "73rd Amendment", "86th Amendment"], answer: 0 },
  { q: "The speed of sound is greatest in which medium?", options: ["Air", "Water", "Steel", "Vacuum"], answer: 2 },
  { q: "Who discovered the Indian sea route from Europe in 1498?", options: ["Christopher Columbus", "Vasco da Gama", "Ferdinand Magellan", "Bartolomeu Dias"], answer: 1 },
  { q: "Which hormone is known as the 'fight or flight' hormone?", options: ["Insulin", "Adrenaline", "Thyroxine", "Oxytocin"], answer: 1 },
  { q: "The 'Kyoto Protocol' was concerned with reducing __", options: ["nuclear weapons", "greenhouse gas emissions", "trade tariffs", "ozone-depleting CFCs"], answer: 1 },
  { q: "Which Indian city was the capital of British India before New Delhi?", options: ["Mumbai", "Chennai", "Kolkata", "Allahabad"], answer: 2 },
  { q: "The value of the acceleration due to gravity on Earth is approximately __ m/s².", options: ["8.8", "9.8", "10.8", "11.2"], answer: 1 },
  { q: "Which international treaty established the European Union?", options: ["Treaty of Rome", "Maastricht Treaty", "Treaty of Lisbon", "Schengen Agreement"], answer: 1 },
  { q: "The 'Chipko Movement' was primarily aimed at protecting __", options: ["rivers", "forests", "wildlife", "farmland"], answer: 1 },
  { q: "Which blood cells are primarily responsible for immunity?", options: ["Red blood cells", "White blood cells", "Platelets", "Plasma"], answer: 1 },
  { q: "Who propounded the theory of 'Sovereignty' as absolute and indivisible?", options: ["John Locke", "Thomas Hobbes", "Jean Bodin", "Montesquieu"], answer: 2 },
  { q: "The Higgs boson is often referred to in the media as the '__ particle'.", options: ["Ghost", "God", "Dark", "Phantom"], answer: 1 },
];

export const DUMMY_PAPERS: Record<string, Paper> = {
  "SET2026-IX": toPaper("SET2026-IX", IX),
  "SET2026-X": toPaper("SET2026-X", X),
  "SET2026-XI": toPaper("SET2026-XI", XI),
  "SET2026-XII": toPaper("SET2026-XII", XII),
};
