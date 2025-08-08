declare type IChildren = Readonly<{
  children: ReactNode
}>

declare interface IElement {
  className?: string
}

declare interface IErrorBoundary {
  error: Error
  errorInfo?: ErrorInfo
  reset?: () => void
}

declare type IProvider<P = Record> = P & IChildren

declare type Component<T = IKeyValuePair, E = IKeyValuePair> = React.FC<T & E>
