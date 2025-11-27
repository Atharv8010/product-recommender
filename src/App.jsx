import React, {useState} from 'react'

const products = [
  { id: 1, name: "Samsung Galaxy A54", price: 449, category: "Phone" },
  { id: 2, name: "iPhone 13", price: 699, category: "Phone" },
  { id: 3, name: "Google Pixel 7a", price: 499, category: "Phone" },
  { id: 4, name: "OnePlus Nord", price: 399, category: "Phone" },
  { id: 5, name: "MacBook Air M1", price: 999, category: "Laptop" },
  { id: 6, name: "Dell Inspiron 15", price: 649, category: "Laptop" },
  { id: 7, name: "HP Pavilion", price: 549, category: "Laptop" },
  { id: 8, name: "Sony Headphones", price: 349, category: "Headphones" },
  { id: 9, name: "AirPods Pro", price: 249, category: "Headphones" },
]

export default function App(){
  const [q,setQ] = useState('')
  const [rec,setRec] = useState([])
  const [loading,setLoading] = useState(false)

  async function callGemini(query){
    const key = import.meta.env.VITE_GEMINI_API_KEY
    if(!key) throw new Error('API key missing. Put VITE_GEMINI_API_KEY in .env')
    const prompt = `Products: ${JSON.stringify(products)}\nUser query: "${query}"\nReturn only a JSON array of recommended product ids from the list, e.g. [1,4]. If none match return []`
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-mini:generateText?key=${key}`
    const body = {
      prompt: {
        text: prompt
      },
      temperature: 0.0,
      maxOutputTokens: 200
    }
    const r = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(body)
    })
    if(!r.ok){
      const t = await r.text()
      throw new Error('Gemini error: ' + t)
    }
    const j = await r.json()
    const text = j.candidates && j.candidates[0] && j.candidates[0].output ? j.candidates[0].output : (j.result && j.result.output ? j.result.output : JSON.stringify(j))
    return text
  }

  function extractIds(text){
    const m = text.match(/\[[^\]]*\]/s)
    if(!m) return []
    try{
      const arr = JSON.parse(m[0])
      if(Array.isArray(arr)) return arr.filter(n=>typeof n==='number')
    }catch(e){
      return []
    }
    return []
  }

  async function search(){
    if(!q.trim()){
      alert('type something like: phone under 500')
      return
    }
    setLoading(true)
    setRec([])
    try{
      const text = await callGemini(q)
      const ids = extractIds(text)
      if(ids.length>0){
        const found = ids.map(id=>products.find(p=>p.id===id)).filter(Boolean)
        setRec(found)
      }else{
        const fallback = localFilter(q)
        setRec(fallback)
        if(fallback.length===0) alert('No products found')
      }
    }catch(e){
      const fallback = localFilter(q)
      setRec(fallback)
      if(fallback.length===0) alert('API error and no local results')
    }finally{
      setLoading(false)
    }
  }

  function localFilter(text){
    const s = text.toLowerCase()
    let max = Infinity
    if(s.includes('under')){
      const after = s.split('under')[1] || ''
      const n = after.match(/\d+/)
      if(n) max = parseInt(n[0],10)
    }
    let cat = ''
    if(s.includes('phone')) cat='Phone'
    if(s.includes('laptop')) cat='Laptop'
    if(s.includes('headphone')) cat='Headphones'
    return products.filter(p=>p.price<=max && (cat===''||p.category===cat))
  }

  return (
    <div className="wrap">
      <h1>Product Recommender</h1>
      <div className="card">
        <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter' && search()} placeholder='e.g. "phone under 500"' />
        <button onClick={search}>{loading ? 'Searching...' : 'Search'}</button>
      </div>

      <h2>Recommended</h2>
      <div className="grid">
        {rec.length===0 ? <p className="muted">No recommendations yet</p> : rec.map(p=>(
          <div key={p.id} className="item">
            <div className="title">{p.name}</div>
            <div className="price">${p.price}</div>
            <div className="cat">{p.category}</div>
          </div>
        ))}
      </div>

      <h2>All Products</h2>
      <div className="grid">
        {products.map(p=>(
          <div key={p.id} className="item">
            <div className="title">{p.name}</div>
            <div className="price">${p.price}</div>
            <div className="cat">{p.category}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
