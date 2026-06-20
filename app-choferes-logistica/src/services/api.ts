
export async function getDriverLicenseStatus(conductorId: string, token: string) {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || '';
  const url = `${baseUrl}/api/conductores/${conductorId}/license-status`;
  
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('No se pudo obtener el estado de la licencia');
  }

  return res.json();
}
