fetch('http://localhost:3000/api/rutas?limit=5')
  .then(r => r.json())
  .then(j => console.log(JSON.stringify(j.data, null, 2)))
  .catch(e => console.error(e));
