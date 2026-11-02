export interface Reward {
  id: string;
  sponsor: string;
  title: string;
  description: string;
  coins: number;
  category: 'food' | 'transport' | 'shopping' | 'culture';
  emoji: string;
  stock: number;
}

export const REWARDS: Reward[] = [
  {
    id: '1',
    sponsor: 'Monoprix',
    title: 'Bon de réduction 5 DT',
    description: 'Valable sur tout achat en caisse Monoprix',
    coins: 50,
    category: 'shopping',
    emoji: '🛒',
    stock: 20,
  },
  {
    id: '2',
    sponsor: 'Métro Tunis',
    title: 'Ticket de métro gratuit',
    description: 'Un trajet simple sur le réseau Metro Léger',
    coins: 30,
    category: 'transport',
    emoji: '🚇',
    stock: 50,
  },
  {
    id: '3',
    sponsor: 'Pizza Hut',
    title: 'Pizza personnelle offerte',
    description: 'Pizza individuelle au choix dans les restaurants participants',
    coins: 100,
    category: 'food',
    emoji: '🍕',
    stock: 10,
  },
  {
    id: '4',
    sponsor: 'Géant',
    title: 'Bon 10 DT',
    description: 'Valable pour tout achat supérieur à 30 DT',
    coins: 80,
    category: 'shopping',
    emoji: '🏪',
    stock: 15,
  },
  {
    id: '5',
    sponsor: 'Cinéma Colisée',
    title: 'Place de cinéma',
    description: 'Une entrée standard dans les salles Colisée',
    coins: 70,
    category: 'culture',
    emoji: '🎬',
    stock: 8,
  },
  {
    id: '6',
    sponsor: 'Café Sarra',
    title: 'Café + Croissant',
    description: 'Un café et un croissant offerts le matin',
    coins: 25,
    category: 'food',
    emoji: '☕',
    stock: 30,
  },
];
