export const media = {
  mestia: ['Mestia_with_Svan_towers.jpg', 'b/b1', 'Jelger Groeneveld', 'by/2.0', 'מסטיה'],
  zhabeshi: ['Village_Zhabeshi.jpg', '5/59', 'Gogi Bedenashvili', 'by-sa/2.0', 'ז׳בשי'],
  adishi: ['Adishi_–_03.jpg', 'd/db', 'Maesi64', 'zero/1.0', 'אדישי'],
  glacier: ['Adishi_Glacier.jpg', 'e/e5', 'Martin Lopatka', 'by-sa/2.0', 'קרחון אדישי'],
  ushguli: ['Ushguli,_Svaneti.jpg', '4/43', 'Paata Vardanashvili', 'by/2.0', 'אושגולי']
};

export function imageSource(key) {
  const [filename, hash] = media[key];
  const file = encodeURIComponent(filename);
  const root = 'https://upload.wikimedia.org/wikipedia/commons';
  const original = `${root}/${hash}/${file}`;
  return key === 'zhabeshi' ? [original] : [`${root}/thumb/${hash}/${file}/960px-${file}`, original];
}
