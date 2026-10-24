export interface CuratedLesson {
  id: string;
  youtubeId: string;
  title: string;
  creator: string;
  category: string;
  categoryTag: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  thumbnail: string;
  url: string;
  color: string;
  summary: string;
}

export const CURATED_LESSONS: CuratedLesson[] = [
  {
    id: 'aircAruvnKk',
    youtubeId: 'aircAruvnKk',
    title: 'But what is a neural network? | Deep learning, chapter 1',
    creator: '3Blue1Brown',
    category: 'Artificial Intelligence',
    categoryTag: 'AI',
    duration: '19 min',
    difficulty: 'Intermediate',
    thumbnail: 'https://img.youtube.com/vi/aircAruvnKk/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=aircAruvnKk',
    color: '#8B7CFF',
    summary: 'Master neurons, weights, biases, and visual activations for handwritten digit recognition.',
  },
  {
    id: 'rGezsHbz60Y',
    youtubeId: 'rGezsHbz60Y',
    title: 'React Server Components Explained in 10 Minutes',
    creator: 'Fireship',
    category: 'Web Development',
    categoryTag: 'Frontend',
    duration: '14 min',
    difficulty: 'Advanced',
    thumbnail: 'https://img.youtube.com/vi/rGezsHbz60Y/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=rGezsHbz60Y',
    color: '#67D7FF',
    summary: 'Zero-bundle-size components, server streaming, and seamless client boundary hydration.',
  },
  {
    id: '_uQrJ0TkZlc',
    youtubeId: '_uQrJ0TkZlc',
    title: 'Python for Beginners — Full Course [Programming Tutorial]',
    creator: 'Programming with Mosh',
    category: 'Computer Science',
    categoryTag: 'Python',
    duration: '22 min',
    difficulty: 'Beginner',
    thumbnail: 'https://img.youtube.com/vi/_uQrJ0TkZlc/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=_uQrJ0TkZlc',
    color: '#4ADEB5',
    summary: 'Learn variables, loops, lists, functions, and object-oriented patterns from scratch.',
  },
  {
    id: 'QuR969uMICM',
    youtubeId: 'QuR969uMICM',
    title: 'How Quantum Computers Break Modern Encryption',
    creator: 'Veritasium',
    category: 'Physics & Math',
    categoryTag: 'Physics',
    duration: '16 min',
    difficulty: 'Intermediate',
    thumbnail: 'https://img.youtube.com/vi/QuR969uMICM/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=QuR969uMICM',
    color: '#818CF8',
    summary: 'Qubits, superposition, quantum entanglement, and Shor’s algorithm visualized.',
  },
  {
    id: '7vTwy_x5_Bw',
    youtubeId: '7vTwy_x5_Bw',
    title: 'Docker in 100 Seconds // Quick Concepts Guide',
    creator: 'Fireship',
    category: 'Systems & DevOps',
    categoryTag: 'DevOps',
    duration: '12 min',
    difficulty: 'Beginner',
    thumbnail: 'https://img.youtube.com/vi/7vTwy_x5_Bw/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=7vTwy_x5_Bw',
    color: '#F5C95B',
    summary: 'Containerization, Dockerfiles, images, layers, and lightweight reproducible environments.',
  },
  {
    id: 'z-EtmaFJieY',
    youtubeId: 'z-EtmaFJieY',
    title: 'Linear Algebra for Machine Learning: Matrices & Vectors',
    creator: 'StatQuest',
    category: 'Physics & Math',
    categoryTag: 'Math',
    duration: '18 min',
    difficulty: 'Intermediate',
    thumbnail: 'https://img.youtube.com/vi/z-EtmaFJieY/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=z-EtmaFJieY',
    color: '#67D7FF',
    summary: 'Dot products, transformations, eigenvalues, and dimensionality reduction made intuitive.',
  },
];

export const TOPIC_CATEGORIES = [
  'All Topics',
  'Artificial Intelligence',
  'Web Development',
  'Computer Science',
  'Physics & Math',
  'Systems & DevOps',
];

export const QUICK_PRACTICE_DECKS = [
  {
    id: 'qp-1',
    topic: 'Neural Networks & Activations',
    emoji: '🧠',
    questionCount: 5,
    estimatedMinutes: 4,
    color: '#8B7CFF',
    difficulty: 'Intermediate',
  },
  {
    id: 'qp-2',
    topic: 'Python Fundamentals & Lists',
    emoji: '📚',
    questionCount: 10,
    estimatedMinutes: 7,
    color: '#4ADEB5',
    difficulty: 'Beginner',
  },
  {
    id: 'qp-3',
    topic: 'React Server Components & Hooks',
    emoji: '⚡',
    questionCount: 5,
    estimatedMinutes: 3,
    color: '#67D7FF',
    difficulty: 'Advanced',
  },
];
