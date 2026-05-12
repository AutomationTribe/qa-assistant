export class NotFoundError extends Error {
  constructor(message: string = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ValidationError extends Error {
  constructor(message: string = 'Validation error') {
    super(message)
    this.name = 'ValidationError'
  }
}
