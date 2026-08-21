import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Session from './pages/Session'
import BodyWeight from './pages/BodyWeight'
import Progress from './pages/Progress'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/workout/:id" element={<Session />} />
      <Route path="/weight" element={<BodyWeight />} />
      <Route path="/progress" element={<Progress />} />
    </Routes>
  )
}

export default App
