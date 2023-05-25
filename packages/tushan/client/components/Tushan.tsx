import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { BuiltinRoutes } from './BuiltinRoutes';
import { TushanContextProps, TushanContextProvider } from '../context/tushan';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { defaultQueryClient } from '../api';
import { ArcoDesignProvider } from './ArcoDesignProvider';
import '@arco-design/web-react/dist/css/arco.css';

interface TushanProps extends TushanContextProps, React.PropsWithChildren {
  queryClient?: QueryClient;
}
export const Tushan: React.FC<TushanProps> = React.memo((props) => {
  const { basename, queryClient = defaultQueryClient } = props;

  return (
    <TushanContextProvider {...props}>
      <QueryClientProvider client={queryClient}>
        <ArcoDesignProvider>
          <BrowserRouter basename={basename}>
            <BuiltinRoutes>{props.children}</BuiltinRoutes>
          </BrowserRouter>
        </ArcoDesignProvider>
      </QueryClientProvider>
    </TushanContextProvider>
  );
});
Tushan.displayName = 'Tushan';
