/**
 * ⚠️ THE REAL SET 2026 PAPERS — SERVER ONLY. This module holds the ANSWER KEYS.
 *
 * Import it from a Client Component and every key ships to every phone, and the
 * exam is over before it begins. Route handlers and Server Components only. The
 * client is only ever given `publicQuestions()` (see papers.ts), whose type has
 * no field an answer could live in.
 *
 * Four papers — SET2026-IX, -X, -XI, -XII — one per class, 50 questions each.
 * Extracted verbatim from the official Word papers in "Question Papers/" on
 * 2026-07-19: question stems and options exactly as written, and the correct
 * option taken from each paper's own answer key (IX/X had an "Answer Key" block;
 * XI/XII marked each answer inline as "Ans: X"). If a question needs fixing, fix
 * it HERE and nowhere else — the key and the questions live together so they can
 * never drift apart.
 *
 * The online exam is class-wise only: stream never divides it. See config.ts.
 */
import type { Paper } from "./papers";
import { EXAM } from "./config.ts";

/** A question with its answer attached, so the key can never drift from the paper. */
type Keyed = { context?: string; q: string; options: string[]; answer: number };

/** Split the answer into a separate key, producing a Paper whose questions carry none. */
function toPaper(id: string, qs: Keyed[]): Paper {
  if (qs.length !== EXAM.questionCount) {
    throw new Error(`${id}: expected ${EXAM.questionCount} questions, got ${qs.length}`);
  }
  for (const [i, x] of qs.entries()) {
    if (!Number.isInteger(x.answer) || x.answer < 0 || x.answer >= x.options.length) {
      throw new Error(`${id} q${i + 1}: answer index ${x.answer} out of range`);
    }
    if (x.options.length !== 4) {
      throw new Error(`${id} q${i + 1}: expected 4 options, got ${x.options.length}`);
    }
  }
  return {
    id,
    questions: qs.map(({ context, q, options }) => ({ context, q, options })),
    key: qs.map((x) => x.answer),
  };
}

const IX: Keyed[] = [
  { q: "Choose the correct synonym of “Brave”:", options: ["Cowardly", "Fearless", "Weak", "Timid"], answer: 1 },
  { q: "Which of the following is a noun?", options: ["Beautiful", "Quickly", "Honesty", "Run"], answer: 2 },
  { q: "“She _ to school every day.”", options: ["go", "goes", "gone", "going"], answer: 1 },
  { q: "The antonym of “Ancient” is:", options: ["Historic", "Old", "Modern", "Antique"], answer: 2 },
  { q: "Which punctuation mark is used after an interrogative sentence?", options: [".", ",", "!", "?"], answer: 3 },
  { q: "The plural of “Child” is:", options: ["Childs", "Children", "Childes", "Childrens"], answer: 1 },
  { q: "Choose the correct article: “He is _ honest man.”", options: ["a", "an", "the", "no article"], answer: 1 },
  { q: "“A person who writes poems” is called:", options: ["Novelist", "Editor", "Poet", "Author"], answer: 2 },
  { q: "Which is an adjective?", options: ["Beauty", "Beautiful", "Beautify", "Beautifully"], answer: 1 },
  { q: "“Break the ice” means:", options: ["Destroy ice", "Start a conversation", "Feel cold", "Stop talking"], answer: 1 },
  { q: "The value of √144 is:", options: ["10", "11", "12", "14"], answer: 2 },
  { q: "If x = 5, then 2x + 3 =", options: ["10", "12", "13", "15"], answer: 2 },
  { q: "The sum of angles of a triangle is:", options: ["90°", "180°", "270°", "360°"], answer: 1 },
  { q: "25% of 200 =", options: ["25", "40", "50", "75"], answer: 2 },
  { q: "The area of a square of side 8 cm is:", options: ["32 cm²", "64 cm²", "16 cm²", "48 cm²"], answer: 1 },
  { q: "The value of π is approximately:", options: ["2.14", "3.14", "4.14", "5.14"], answer: 1 },
  { q: "A linear equation has:", options: ["Degree 2", "Degree 3", "Degree 1", "Degree 0"], answer: 2 },
  { q: "The perimeter of a rectangle of length 8 cm and breadth 5 cm is:", options: ["26 cm", "40 cm", "13 cm", "30 cm"], answer: 0 },
  { q: "SI unit of force is:", options: ["Joule", "Newton", "Watt", "Pascal"], answer: 1 },
  { q: "Which of the following is a metal?", options: ["Sulphur", "Oxygen", "Iron", "Carbon"], answer: 2 },
  { q: "The speed of light in vacuum is:", options: ["3 × 10⁸ m/s", "3 × 10⁶ m/s", "3 × 10⁴ m/s", "3 × 10² m/s"], answer: 0 },
  { q: "Water boils at:", options: ["50°C", "75°C", "100°C", "120°C"], answer: 2 },
  { q: "The unit of electric current is:", options: ["Volt", "Ampere", "Ohm", "Watt"], answer: 1 },
  { q: "Which is a renewable source of energy?", options: ["Coal", "Petroleum", "Solar Energy", "Natural Gas"], answer: 2 },
  { q: "Sound travels fastest through:", options: ["Vacuum", "Air", "Water", "Steel"], answer: 3 },
  { q: "The process of conversion of liquid into vapour is:", options: ["Condensation", "Evaporation", "Freezing", "Sublimation"], answer: 1 },
  { q: "The basic unit of life is:", options: ["Tissue", "Organ", "Cell", "Organism"], answer: 2 },
  { q: "Photosynthesis takes place in:", options: ["Roots", "Stem", "Chloroplast", "Flower"], answer: 2 },
  { q: "The green pigment in plants is:", options: ["Hemoglobin", "Melanin", "Chlorophyll", "Carotene"], answer: 2 },
  { q: "Which blood cells help fight infection?", options: ["RBC", "WBC", "Platelets", "Plasma"], answer: 1 },
  { q: "The human heart has:", options: ["2 chambers", "3 chambers", "4 chambers", "5 chambers"], answer: 2 },
  { q: "Which gas is released during photosynthesis?", options: ["Nitrogen", "Carbon dioxide", "Oxygen", "Hydrogen"], answer: 2 },
  { q: "Vitamin D deficiency causes:", options: ["Scurvy", "Beriberi", "Rickets", "Anaemia"], answer: 2 },
  { q: "The largest organ of the human body is:", options: ["Heart", "Liver", "Skin", "Brain"], answer: 2 },
  { q: "The Revolt of 1857 is also known as:", options: ["Green Revolution", "First War of Independence", "Industrial Revolution", "French Revolution"], answer: 1 },
  { q: "Who founded the Brahmo Samaj?", options: ["Swami Vivekananda", "Raja Rammohan Roy", "Ishwar Chandra Vidyasagar", "Rabindranath Tagore"], answer: 1 },
  { q: "The Indian National Congress was founded in:", options: ["1857", "1885", "1905", "1947"], answer: 1 },
  { q: "Who is known as the “Father of the Indian Renaissance”?", options: ["Bankim Chandra Chattopadhyay", "Raja Rammohan Roy", "Surendranath Banerjee", "Keshab Chandra Sen"], answer: 1 },
  { q: "The Partition of Bengal took place in:", options: ["1885", "1905", "1911", "1942"], answer: 1 },
  { q: "Who gave the slogan “Do or Die”?", options: ["Subhas Chandra Bose", "Mahatma Gandhi", "Jawaharlal Nehru", "Bal Gangadhar Tilak"], answer: 1 },
  { q: "The Earth revolves around:", options: ["Moon", "Mars", "Sun", "Jupiter"], answer: 2 },
  { q: "The largest continent is:", options: ["Europe", "Africa", "Asia", "Australia"], answer: 2 },
  { q: "The Tropic of Cancer passes through:", options: ["Southern India", "Northern India", "Central India", "Sri Lanka"], answer: 2 },
  { q: "The capital of West Bengal is:", options: ["Siliguri", "Durgapur", "Kolkata", "Asansol"], answer: 2 },
  { q: "The national flower of India is:", options: ["Rose", "Lotus", "Lily", "Jasmine"], answer: 1 },
  { q: "World Environment Day is observed on:", options: ["22 April", "5 June", "8 March", "16 September"], answer: 1 },
  { q: "The currency of Bangladesh is:", options: ["Rupee", "Taka", "Riyal", "Yen"], answer: 1 },
  { q: "The headquarters of the United Nations is in:", options: ["London", "Paris", "Geneva", "New York"], answer: 3 },
  { q: "The national bird of India is:", options: ["Sparrow", "Peacock", "Eagle", "Parrot"], answer: 1 },
  { q: "Which planet is known as the Red Planet?", options: ["Venus", "Mercury", "Mars", "Jupiter"], answer: 2 },
];

const X: Keyed[] = [
  { q: "Choose the correct synonym of “Diligent”:", options: ["Lazy", "Hardworking", "Careless", "Weak"], answer: 1 },
  { q: "The antonym of “Victory” is:", options: ["Success", "Achievement", "Defeat", "Triumph"], answer: 2 },
  { q: "“Neither the teacher nor the students _ present.”", options: ["is", "are", "was", "has"], answer: 1 },
  { q: "Choose the correct article: “She is _ European citizen.”", options: ["an", "a", "the", "no article"], answer: 1 },
  { q: "The passive voice of “They are building a bridge” is:", options: ["A bridge is built by them.", "A bridge was being built by them.", "A bridge is being built by them.", "A bridge has been built by them."], answer: 2 },
  { q: "“A person who cannot read or write” is called:", options: ["Scholar", "Literate", "Illiterate", "Author"], answer: 2 },
  { q: "Which is an adverb?", options: ["Slow", "Slowly", "Slowness", "Sluggish"], answer: 1 },
  { q: "“Once in a blue moon” means:", options: ["Frequently", "Daily", "Rarely", "Never"], answer: 2 },
  { q: "The plural of “Crisis” is:", options: ["Crisises", "Crises", "Crisises", "Crisis"], answer: 1 },
  { q: "Who wrote The Merchant of Venice?", options: ["John Keats", "William Shakespeare", "Charles Dickens", "John Milton"], answer: 1 },
  { q: "The value of √625 is:", options: ["15", "20", "25", "30"], answer: 2 },
  { q: "If x² = 81, then x =", options: ["9 only", "–9 only", "±9", "±81"], answer: 2 },
  { q: "The sum of the angles of a quadrilateral is:", options: ["180°", "270°", "360°", "540°"], answer: 2 },
  { q: "The area of a circle of radius 7 cm is:", options: ["154 cm²", "144 cm²", "164 cm²", "176 cm²"], answer: 0 },
  { q: "The distance between points (0,0) and (3,4) is:", options: ["5", "6", "7", "8"], answer: 0 },
  { q: "The probability of getting a head in a single toss of a fair coin is:", options: ["0", "1/4", "1/2", "1"], answer: 2 },
  { q: "The value of (a² × a³) is:", options: ["a⁵", "a⁶", "a⁹", "a"], answer: 0 },
  { q: "If the circumference of a circle is 44 cm, then its radius is:", options: ["7 cm", "14 cm", "21 cm", "3.5 cm"], answer: 0 },
  { q: "SI unit of power is:", options: ["Joule", "Newton", "Watt", "Volt"], answer: 2 },
  { q: "Which metal is liquid at room temperature?", options: ["Iron", "Mercury", "Copper", "Aluminium"], answer: 1 },
  { q: "The pH value of a neutral solution is:", options: ["0", "5", "7", "14"], answer: 2 },
  { q: "The unit of electric resistance is:", options: ["Volt", "Ampere", "Ohm", "Watt"], answer: 2 },
  { q: "Which gas is mainly responsible for global warming?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], answer: 2 },
  { q: "Convex lens is also known as:", options: ["Diverging lens", "Converging lens", "Plane lens", "Cylindrical lens"], answer: 1 },
  { q: "The speed of sound in air is approximately:", options: ["340 m/s", "30 m/s", "3000 m/s", "30,000 m/s"], answer: 0 },
  { q: "The law of conservation of energy states that energy:", options: ["Can be created", "Can be destroyed", "Can neither be created nor destroyed", "Disappears over time"], answer: 2 },
  { q: "The functional unit of the kidney is:", options: ["Neuron", "Nephron", "Alveolus", "Axon"], answer: 1 },
  { q: "Photosynthesis occurs in:", options: ["Mitochondria", "Ribosomes", "Chloroplasts", "Nucleus"], answer: 2 },
  { q: "Which hormone regulates blood sugar level?", options: ["Thyroxine", "Adrenaline", "Insulin", "Estrogen"], answer: 2 },
  { q: "Human blood group was discovered by:", options: ["Mendel", "Darwin", "Landsteiner", "Pasteur"], answer: 2 },
  { q: "Which vitamin helps in blood clotting?", options: ["Vitamin A", "Vitamin C", "Vitamin D", "Vitamin K"], answer: 3 },
  { q: "The genetic material in most organisms is:", options: ["RNA", "DNA", "Protein", "Lipid"], answer: 1 },
  { q: "Which part of the brain controls balance?", options: ["Cerebrum", "Cerebellum", "Medulla", "Pons"], answer: 1 },
  { q: "The process of cell division producing two identical cells is:", options: ["Meiosis", "Mitosis", "Fertilization", "Mutation"], answer: 1 },
  { q: "The Non-Cooperation Movement was launched in:", options: ["1905", "1919", "1920", "1942"], answer: 2 },
  { q: "Who founded the Azad Hind Fauj (INA)?", options: ["Mahatma Gandhi", "Jawaharlal Nehru", "Subhas Chandra Bose", "Bal Gangadhar Tilak"], answer: 2 },
  { q: "The Partition of Bengal was annulled in:", options: ["1905", "1908", "1911", "1919"], answer: 2 },
  { q: "The Quit India Movement was launched in:", options: ["1930", "1935", "1942", "1947"], answer: 2 },
  { q: "Who wrote Anandamath?", options: ["Rabindranath Tagore", "Bankim Chandra Chattopadhyay", "Sarat Chandra Chattopadhyay", "Ishwar Chandra Vidyasagar"], answer: 1 },
  { q: "India became independent on:", options: ["26 January 1950", "15 August 1947", "9 August 1942", "26 November 1949"], answer: 1 },
  { q: "The Tropic of Cancer passes through how many states of India?", options: ["6", "7", "8", "9"], answer: 2 },
  { q: "The largest delta in the world is:", options: ["Nile Delta", "Mississippi Delta", "Sundarbans Delta", "Mekong Delta"], answer: 2 },
  { q: "Which is the longest river in the world?", options: ["Amazon", "Nile", "Yangtze", "Mississippi"], answer: 1 },
  { q: "The capital of Australia is:", options: ["Sydney", "Melbourne", "Canberra", "Perth"], answer: 2 },
  { q: "The national anthem of India was composed by:", options: ["Bankim Chandra Chattopadhyay", "Rabindranath Tagore", "Kazi Nazrul Islam", "Sarat Chandra Chattopadhyay"], answer: 1 },
  { q: "The headquarters of UNESCO is located in:", options: ["Geneva", "Paris", "New York", "London"], answer: 1 },
  { q: "World Earth Day is observed on:", options: ["5 June", "22 April", "21 March", "16 September"], answer: 1 },
  { q: "The currency of Nepal is:", options: ["Rupee", "Taka", "Yuan", "Ringgit"], answer: 0 },
  { q: "Which planet is known as the Morning Star?", options: ["Venus", "Mars", "Mercury", "Jupiter"], answer: 0 },
  { q: "The United Nations was established in:", options: ["1919", "1939", "1945", "1950"], answer: 2 },
];

const XI: Keyed[] = [
  { q: "Which part of speech is the word “Honesty”?", options: ["Verb", "Adjective", "Noun", "Adverb"], answer: 2 },
  { q: "Choose the correct synonym of “Brave”:", options: ["Cowardly", "Fearless", "Weak", "Timid"], answer: 1 },
  { q: "Choose the antonym of “Ancient”:", options: ["Old", "Antique", "Modern", "Historic"], answer: 2 },
  { q: "“She __ to school every day.”", options: ["go", "goes", "going", "gone"], answer: 1 },
  { q: "The passive form of “They play football” is:", options: ["Football played by them.", "Football is played by them.", "Football was played by them.", "Football has played by them."], answer: 1 },
  { q: "Which punctuation mark is used at the end of a question?", options: ["Full stop", "Comma", "Question mark", "Colon"], answer: 2 },
  { q: "“A person who writes poems” is called:", options: ["Novelist", "Poet", "Editor", "Critic"], answer: 1 },
  { q: "Which is a collective noun?", options: ["Team", "Boy", "River", "House"], answer: 0 },
  { q: "Choose the correct spelling:", options: ["Accomodation", "Accommodation", "Acommodation", "Accommadation"], answer: 1 },
  { q: "“The sun rises in the east.” This is:", options: ["Interrogative", "Imperative", "Exclamatory", "Assertive"], answer: 3 },
  { q: "The plural of “Child” is:", options: ["Childs", "Children", "Childes", "Childrens"], answer: 1 },
  { q: "An adjective qualifies a:", options: ["Verb", "Noun", "Adverb", "Conjunction"], answer: 1 },
  { q: "Which word is an adverb?", options: ["Beautiful", "Beauty", "Beautifully", "Beautify"], answer: 2 },
  { q: "“Rome was not built in a day” is:", options: ["Proverb", "Idiom", "Phrase", "Clause"], answer: 0 },
  { q: "Choose the correct article: “He is __ honest man.”", options: ["a", "an", "the", "no article"], answer: 1 },
  { q: "“If I were a bird…” is an example of:", options: ["Present tense", "Past tense", "Subjunctive mood", "Imperative mood"], answer: 2 },
  { q: "Who wrote Paradise Lost?", options: ["Shakespeare", "Milton", "Wordsworth", "Keats"], answer: 1 },
  { q: "A sentence with one independent clause is:", options: ["Compound", "Complex", "Simple", "Compound-complex"], answer: 2 },
  { q: "The opposite of “Generous” is:", options: ["Kind", "Noble", "Mean", "Honest"], answer: 2 },
  { q: "“Break the ice” means:", options: ["Destroy ice", "Start a conversation", "Feel cold", "End a meeting"], answer: 1 },
  { q: "The capital of India is:", options: ["Mumbai", "Kolkata", "New Delhi", "Chennai"], answer: 2 },
  { q: "The national animal of India is:", options: ["Lion", "Tiger", "Elephant", "Peacock"], answer: 1 },
  { q: "The Constitution of India came into force on:", options: ["15 August 1947", "26 January 1950", "26 November 1949", "2 October 1950"], answer: 1 },
  { q: "Who is known as the Father of the Nation in India?", options: ["Nehru", "Patel", "Gandhi", "Bose"], answer: 2 },
  { q: "The largest continent is:", options: ["Africa", "Europe", "Asia", "Australia"], answer: 2 },
  { q: "The longest river in India is:", options: ["Yamuna", "Godavari", "Ganga", "Narmada"], answer: 2 },
  { q: "The headquarters of the UN is in:", options: ["Geneva", "Paris", "London", "New York"], answer: 3 },
  { q: "Currency of Japan:", options: ["Won", "Yuan", "Yen", "Dollar"], answer: 2 },
  { q: "The Red Fort is located in:", options: ["Agra", "Delhi", "Jaipur", "Lucknow"], answer: 1 },
  { q: "The largest ocean is:", options: ["Indian", "Atlantic", "Arctic", "Pacific"], answer: 3 },
  { q: "How many states are there in India?", options: ["26", "27", "28", "29"], answer: 2 },
  { q: "Which planet is known as the Red Planet?", options: ["Venus", "Jupiter", "Mars", "Mercury"], answer: 2 },
  { q: "The national flower of India is:", options: ["Rose", "Lotus", "Jasmine", "Lily"], answer: 1 },
  { q: "Who discovered gravity?", options: ["Newton", "Einstein", "Galileo", "Edison"], answer: 0 },
  { q: "The largest democracy in the world is:", options: ["USA", "India", "Brazil", "UK"], answer: 1 },
  { q: "Which gas do plants absorb?", options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], answer: 2 },
  { q: "World Environment Day is observed on:", options: ["22 April", "5 June", "8 March", "16 September"], answer: 1 },
  { q: "Who wrote the National Anthem of India?", options: ["Bankim Chandra", "Rabindranath Tagore", "Nazrul Islam", "Sarat Chandra"], answer: 1 },
  { q: "The Indian Parliament consists of:", options: ["One House", "Two Houses", "Three Houses", "Four Houses"], answer: 1 },
  { q: "The currency of Bangladesh is:", options: ["Taka", "Rupee", "Riyal", "Ringgit"], answer: 0 },
  { q: "Which country hosted the ICC Champions Trophy 2025?", options: ["India", "Australia", "Pakistan", "England"], answer: 2 },
  { q: "G20 Summit 2025 was hosted by:", options: ["South Africa", "Brazil", "India", "Indonesia"], answer: 0 },
  { q: "Which organization awards the Nobel Prize?", options: ["United Nations", "Nobel Foundation", "UNESCO", "WHO"], answer: 1 },
  { q: "International Yoga Day is celebrated on:", options: ["5 June", "21 June", "1 July", "15 August"], answer: 1 },
  { q: "WHO stands for:", options: ["World Health Organization", "World Human Organization", "Health World Office", "Human Welfare Organization"], answer: 0 },
  { q: "ISRO is the space agency of:", options: ["Japan", "China", "India", "Russia"], answer: 2 },
  { q: "BRICS originally included how many countries?", options: ["3", "4", "5", "6"], answer: 2 },
  { q: "The headquarters of UNESCO is in:", options: ["Geneva", "Paris", "Rome", "Vienna"], answer: 1 },
  { q: "World Water Day is observed on:", options: ["22 March", "5 June", "1 December", "21 April"], answer: 0 },
  { q: "The theme of Sustainable Development Goals (SDGs) was adopted by:", options: ["UNESCO", "WHO", "United Nations", "IMF"], answer: 2 },
];

const XII: Keyed[] = [
  { q: "Who wrote The Tempest?", options: ["John Milton", "William Shakespeare", "Charles Dickens", "Thomas Hardy"], answer: 1 },
  { q: "The word “Benevolent” means:", options: ["Cruel", "Kind", "Proud", "Lazy"], answer: 1 },
  { q: "Choose the antonym of “Optimistic”:", options: ["Hopeful", "Positive", "Pessimistic", "Cheerful"], answer: 2 },
  { q: "Which of the following is a modal verb?", options: ["Write", "Can", "Wrote", "Writing"], answer: 1 },
  { q: "“Had I known, I would have helped you.” This sentence expresses:", options: ["Certainty", "Possibility", "Unreal past condition", "Command"], answer: 2 },
  { q: "A sentence that expresses strong emotion is:", options: ["Assertive", "Interrogative", "Exclamatory", "Imperative"], answer: 2 },
  { q: "The synonym of “Abundant” is:", options: ["Scarce", "Plentiful", "Limited", "Rare"], answer: 1 },
  { q: "“He is good _ Mathematics.”", options: ["at", "on", "in", "for"], answer: 0 },
  { q: "An autobiography is the story of:", options: ["Another person’s life", "A historical event", "One’s own life", "An imaginary character"], answer: 2 },
  { q: "Which figure of speech is used in “Time is a thief”?", options: ["Simile", "Metaphor", "Hyperbole", "Irony"], answer: 1 },
  { q: "Choose the correctly spelt word:", options: ["Privilege", "Privilage", "Previlege", "Priviledge"], answer: 0 },
  { q: "The passive form of “They have completed the work” is:", options: ["The work completed by them.", "The work has been completed by them.", "The work was completed by them.", "The work is completed by them."], answer: 1 },
  { q: "“Neither Ram nor Shyam _ present.”", options: ["are", "were", "is", "have"], answer: 2 },
  { q: "The opposite of “Expand” is:", options: ["Increase", "Extend", "Contract", "Develop"], answer: 2 },
  { q: "“Once in a blue moon” means:", options: ["Every day", "Very rarely", "At night", "Frequently"], answer: 1 },
  { q: "Who wrote Pride and Prejudice?", options: ["Jane Austen", "Emily Brontë", "George Eliot", "Virginia Woolf"], answer: 0 },
  { q: "A group of words without a finite verb is called:", options: ["Clause", "Phrase", "Sentence", "Predicate"], answer: 1 },
  { q: "Which is a conjunction?", options: ["Quickly", "Because", "Honest", "River"], answer: 1 },
  { q: "“The book is _ the table.”", options: ["in", "on", "at", "by"], answer: 1 },
  { q: "The plural of “Phenomenon” is:", options: ["Phenomenons", "Phenomena", "Phenomenaes", "Phenomena"], answer: 1 },
  { q: "The largest state of India by area is:", options: ["Uttar Pradesh", "Rajasthan", "Maharashtra", "Madhya Pradesh"], answer: 1 },
  { q: "The Supreme Court of India is located in:", options: ["Mumbai", "Kolkata", "Chennai", "New Delhi"], answer: 3 },
  { q: "The national bird of India is:", options: ["Peacock", "Parrot", "Swan", "Eagle"], answer: 0 },
  { q: "Which is the smallest continent?", options: ["Europe", "Antarctica", "Australia", "South America"], answer: 2 },
  { q: "The headquarters of the IMF is in:", options: ["Paris", "Washington, D.C.", "Geneva", "London"], answer: 1 },
  { q: "Which vitamin deficiency causes scurvy?", options: ["Vitamin A", "Vitamin B", "Vitamin C", "Vitamin D"], answer: 2 },
  { q: "The study of earthquakes is called:", options: ["Geology", "Seismology", "Meteorology", "Ecology"], answer: 1 },
  { q: "The currency of China is:", options: ["Yen", "Won", "Yuan", "Dollar"], answer: 2 },
  { q: "Who was the first President of India?", options: ["Jawaharlal Nehru", "Rajendra Prasad", "S. Radhakrishnan", "Zakir Husain"], answer: 1 },
  { q: "The Tropic of Cancer passes through how many Indian states?", options: ["6", "7", "8", "9"], answer: 2 },
  { q: "The largest desert in Asia is:", options: ["Sahara", "Gobi", "Thar", "Kalahari"], answer: 1 },
  { q: "Which Indian city is known as the Silicon Valley of India?", options: ["Hyderabad", "Pune", "Bengaluru", "Chennai"], answer: 2 },
  { q: "The National Song of India is:", options: ["Jana Gana Mana", "Sare Jahan Se Achha", "Vande Mataram", "Ae Mere Watan Ke Logon"], answer: 2 },
  { q: "The headquarters of the United Nations is in:", options: ["Geneva", "Paris", "New York", "Vienna"], answer: 2 },
  { q: "Which gas is most abundant in the Earth’s atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Argon"], answer: 1 },
  { q: "Who invented the telephone?", options: ["Thomas Edison", "Alexander Graham Bell", "Marconi", "Newton"], answer: 1 },
  { q: "Which is the longest mountain range in the world?", options: ["Alps", "Himalayas", "Andes", "Rockies"], answer: 2 },
  { q: "The RBI was established in:", options: ["1935", "1947", "1950", "1921"], answer: 0 },
  { q: "Which planet has the maximum number of known moons?", options: ["Jupiter", "Saturn", "Uranus", "Neptune"], answer: 1 },
  { q: "The Father of the Indian Constitution is:", options: ["Mahatma Gandhi", "Jawaharlal Nehru", "B. R. Ambedkar", "Sardar Patel"], answer: 2 },
  { q: "Which country held the BRICS Presidency in 2025?", options: ["India", "China", "Brazil", "Russia"], answer: 2 },
  { q: "World Environment Day is observed every year on:", options: ["22 April", "5 June", "16 September", "21 March"], answer: 1 },
  { q: "International Women’s Day is celebrated on:", options: ["8 March", "5 June", "11 October", "24 January"], answer: 0 },
  { q: "Which organization publishes the World Happiness Report?", options: ["UNESCO", "IMF", "United Nations", "WHO"], answer: 2 },
  { q: "The headquarters of WHO is located in:", options: ["Geneva", "New York", "Paris", "London"], answer: 0 },
  { q: "International Day of Yoga is celebrated on:", options: ["21 June", "5 June", "22 April", "1 July"], answer: 0 },
  { q: "Which Indian space agency conducts missions such as Chandrayaan and Aditya-L1?", options: ["DRDO", "ISRO", "BARC", "HAL"], answer: 1 },
  { q: "COP conferences are mainly related to:", options: ["Education", "Sports", "Climate Change", "Trade"], answer: 2 },
  { q: "The Sustainable Development Goals (SDGs) target year is:", options: ["2028", "2030", "2035", "2040"], answer: 1 },
  { q: "The United Nations was established in:", options: ["1919", "1939", "1945", "1950"], answer: 2 },
];

export const SET2026_PAPERS: Record<string, Paper> = {
  "SET2026-IX": toPaper("SET2026-IX", IX),
  "SET2026-X": toPaper("SET2026-X", X),
  "SET2026-XI": toPaper("SET2026-XI", XI),
  "SET2026-XII": toPaper("SET2026-XII", XII),
};
