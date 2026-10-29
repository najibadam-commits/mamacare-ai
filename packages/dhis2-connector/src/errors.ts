export class Dhis2ValidationError extends Error {
  readonly problems: string[]
  constructor(problems: string[]) {
    super(`Invalid DHIS2 data: ${problems.join('; ')}`)
    this.name = 'Dhis2ValidationError'
    this.problems = problems
  }
}

export class Dhis2RequestError extends Error {
  readonly status: number
  readonly body: unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'Dhis2RequestError'
    this.status = status
    this.body = body
  }
}
