import NextErrorComponent from "next/error";
import Head from "next/head";
import { captureException, flush } from "@sentry/nextjs";

const MyError = ({ statusCode, hasGetInitialPropsRun, err }) => {
  if (!hasGetInitialPropsRun && err) {
    captureException(err);
  }

  return (
    <>
      <Head>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <NextErrorComponent statusCode={statusCode} />
    </>
  );
};

MyError.getInitialProps = async (context) => {
  const errorInitialProps = await NextErrorComponent.getInitialProps(context);

  const { res, err, asPath } = context;

  errorInitialProps.hasGetInitialPropsRun = true;

  if (res?.statusCode === 404) {
    return errorInitialProps;
  }

  if (err) {
    captureException(err);
    await flush(2000);

    return errorInitialProps;
  }

  captureException(
    new Error(`_error.js getInitialProps missing data at path: ${asPath}`)
  );
  await flush(2000);

  return errorInitialProps;
};

export default MyError;
