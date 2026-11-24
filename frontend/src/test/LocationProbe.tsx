import { useLocation } from 'react-router-dom'

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

export default LocationProbe
