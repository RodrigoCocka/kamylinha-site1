// Produto único; valor e descrição são definidos no servidor.
export const PLANS = {
  apoio_privacidade: {
    name: 'Produto digital',
    price: 9.90,
  },
};

export function accessUrlFor() {
  return process.env.PRODUCT_ACCESS_URL || '';
}
