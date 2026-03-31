import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import RegistroViaje from '../../scripts/RegistroViaje';
import ScannerYFirmaMovil from '../../src/components/ScannerYFirmaMovil';

export default function HomeScreen() {
  const [pasoPrevioCompletado, setPasoPrevioCompletado] = useState(false);

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 12 }}>
      <RegistroViaje
        onViajeFinalizado={() => setPasoPrevioCompletado(true)}
        onReiniciarViaje={() => setPasoPrevioCompletado(false)}
      />
      <ScannerYFirmaMovil pasoPrevioCompletado={pasoPrevioCompletado} />
    </ScrollView>
  );
}