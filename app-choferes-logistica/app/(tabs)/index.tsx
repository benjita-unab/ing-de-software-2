import { useState } from 'react';
import RegistroViaje from '../../scripts/RegistroViaje';
import { BotonCerrarDespacho } from '../../src/components/BotonCerrarDespacho';

export default function HomeScreen() {
  const [todoSincronizado, setTodoSincronizado] = useState(false);

  return (
    <>
      <RegistroViaje onSyncComplete={setTodoSincronizado} />
      {todoSincronizado && (
        <BotonCerrarDespacho rutaId="36515438-9272-4841-b3e4-c0d3b943b1c7" />
      )}
    </>
  );
}