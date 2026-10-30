import { useEffect, useState } from 'react'

const read = () => window.location.hash.replace(/^#/, '') || '/'

export function useRoute() {
  const [path, setPath] = useState(read)
  useEffect(() => {
    const on = () => { setPath(read()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return path
}

export const go = (to) => { window.location.hash = to }
export const Link = ({ to, children, ...rest }) => <a href={`#${to}`} {...rest}>{children}</a>
