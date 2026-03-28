import { createContext, useContext, useState, ReactNode } from 'react'

interface SubHeaderContextType {
  subHeader: ReactNode | null
  setSubHeader: (node: ReactNode | null) => void
}

const SubHeaderContext = createContext<SubHeaderContextType>(null!)

export function SubHeaderProvider({ children }: { children: ReactNode }) {
  const [subHeader, setSubHeader] = useState<ReactNode | null>(null)
  return (
    <SubHeaderContext.Provider value={{ subHeader, setSubHeader }}>
      {children}
    </SubHeaderContext.Provider>
  )
}

export const useSubHeader = () => useContext(SubHeaderContext)
