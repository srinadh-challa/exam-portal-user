'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const HomeRedirect = () => {
  const router = useRouter();

  useEffect(() => {
    router.push('/signin'); // Redirect to signin page
  }, [router]);

  return null; // No UI rendered, only redirect
};

export default HomeRedirect;
