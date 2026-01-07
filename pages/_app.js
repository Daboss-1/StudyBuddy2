import { AuthProvider } from '../contexts/AuthContext';
import { SettingsProvider } from '../contexts/SettingsContext';
import FloatingTips from '../components/FloatingTips';
import Head from 'next/head';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'katex/dist/katex.min.css';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="google-site-verification" content="7VRDzGFDJnPoKk5dxWHl-7_cYz08vbLCcF92_klQaK0" />
      </Head>
      <AuthProvider>
        <SettingsProvider>
          <Component {...pageProps} />
          <FloatingTips />
        </SettingsProvider>
      </AuthProvider>
    </>
  );
}
