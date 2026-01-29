import { HelpfulError, type HelpfulErrorMetadata } from './HelpfulError';

/**
 * BadRequestError errors are used to explicitly declare that your logic has successfully rejected a request
 *
 * Named after HTTPStatusCode_400
 * - > The server cannot or will not process the request due to an apparent caller error
 * - https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400
 *
 * Commonly used to return an error to the caller while marking the execution as successful
 * - e.g., the [simple-lambda-handlers](https://github.com/ehmpathy/simple-lambda-handlers) library returns an error to the caller (to notify them of the rejection) while marking the lambda invocation as successful (to avoid cloudwatch metric errors and automated retries)
 */
export class BadRequestError<
  TMetadata extends HelpfulErrorMetadata = HelpfulErrorMetadata,
> extends HelpfulError<TMetadata> {
  constructor(
    message: string,
    ...[metadata]: HelpfulErrorMetadata extends TMetadata
      ? [metadata?: TMetadata]
      : [metadata: TMetadata]
  ) {
    super(['BadRequestError: ', message].join(''), metadata as TMetadata);
  }
}
