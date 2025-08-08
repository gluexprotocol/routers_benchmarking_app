declare type Optional<T> = T extends object ? { [K in keyof T]?: T[K] } : T | undefined | null

declare type Undefinable<T> = undefined | T

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare type ITemporaryVariable = any

declare type IError = ITemporaryVariable

declare type IIterable<T = unknown> = Array<T>

declare type IKeyValuePair<T = unknown> = Record<string, T>

declare type ICallback<T = unknown, E = Error | null> = (error?: E, data?: T) => void
