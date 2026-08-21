import { Link } from 'react-router-dom'
import BodyWeightTracker from '../components/BodyWeightTracker'

function BodyWeight() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 flex flex-col gap-4 items-center">
      <div className="w-full max-w-sm">
        <Link to="/" className="text-neutral-400 hover:text-neutral-200 text-sm">
          &lt; Back
        </Link>
      </div>
      <BodyWeightTracker />
    </div>
  )
}

export default BodyWeight
