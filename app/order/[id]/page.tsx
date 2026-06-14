import { orders } from "../../../data/orders";

export default function OrderPage({ params }) {
  const order = orders.find((o) => o.id === params.id);

  if (!order) {
    return <p>Objednávka neexistuje</p>;
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Objednávka #{order.id}</h1>
      <p>Status: {order.status}</p>
      <p>Dátum: {order.date}</p>
      <p>Cena: {order.price}€</p>
    </main>
  );
}