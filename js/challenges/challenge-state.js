const root=new URL('../../',import.meta.url);
export function createDataStore() {
  const cache=new Map();
  const get=(path,binary=false)=>{
    const key=(binary?'binary:':'json:')+path;
    if(!cache.has(key))cache.set(key,fetch(new URL(path,root)).then(response=>{
      if(!response.ok)throw Error(`Datele nu au putut fi încărcate (${response.status}).`);
      return binary?response.arrayBuffer():response.json();
    }).catch(error=>{cache.delete(key);throw error;}));
    return cache.get(key);
  };
  return {
    config:()=>get('data/challenges/challenges.json'),
    manifest:()=>get('data/challenges/challenge-data.json'),
    async load(id,area='sector1',binary=false){
      const manifest=await this.manifest(),entry=manifest[area]?.[id];
      if(!entry?.file)throw Error('Setul nu este definit în registrul central.');
      return get(entry.file,binary);
    },
    async loadMany(ids,area='sector1'){return Object.fromEntries(await Promise.all(ids.map(async id=>[id,await this.load(id,area)])));}
  };
}
const key='explorare-gis-progress-v1';
export const progress={
  read(){try{const data=JSON.parse(localStorage.getItem(key));return Array.isArray(data)?data.filter(x=>/^[VR][1-6]$/.test(x)):[];}catch{return [];}},
  complete(id){const done=new Set(this.read());done.add(id);try{localStorage.setItem(key,JSON.stringify([...done]));}catch{}},
  reset(){try{localStorage.removeItem(key);}catch{}}
};
