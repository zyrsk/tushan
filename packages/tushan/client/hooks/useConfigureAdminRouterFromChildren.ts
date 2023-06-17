import * as React from 'react';
import {
  Children,
  Dispatch,
  Fragment,
  ReactElement,
  ReactNode,
  SetStateAction,
  useCallback,
  useState,
} from 'react';
import { Category, CategoryProps } from '../components/Category';
import { CustomRoute, CustomRoutesProp } from '../components/CustomRoute';
import { Resource, ResourceProps } from '../components/Resource';
import { TushanCategoryPathInfo, useMenuStore } from '../store/menu';
import { useWatch } from './useWatch';

/**
 * This hook inspects the CoreAdminRouter children and returns them separated in three groups:
 * - Custom routes without layout
 * - Custom routes with layout
 * - Resources
 *
 * It also returns a status:
 * - loading: still loading children from a function child
 * - empty: no resources were provided among children
 * - ready: admin is ready to be rendered
 *
 * @example
 * const {
 *    customRoutesWithLayout,
 *    customRoutesWithoutLayout,
 *    resources,
 *    status,
 * } = useConfigureAdminRouterFromChildren(children);
 */
export const useConfigureAdminRouterFromChildren = (
  children: ReactNode
): RoutesAndResources => {
  // Whenever children are updated, update our custom routes and resources
  const routesAndResources = useRoutesAndResourcesFromChildren(children);

  useRegisterMenu(routesAndResources.resources);
  useRegisterMenu(
    routesAndResources.customRoutesWithLayout,
    (item) => item.element.props.noMenu !== true
  );

  return {
    customRoutesWithLayout: routesAndResources.customRoutesWithLayout,
    customRoutesWithoutLayout: routesAndResources.customRoutesWithoutLayout,
    resources: routesAndResources.resources,
    components: routesAndResources.components,
  };
};

function useRegisterMenu<
  T extends {
    path: TushanCategoryPathInfo[];
    element: ReactElement<Pick<CustomRoutesProp, 'name' | 'label' | 'icon'>>;
  }
>(routes: T[], filterFn: (item: T) => boolean = () => true) {
  useWatch([routes], () => {
    const filteredRoutes = routes.filter(filterFn);

    filteredRoutes.forEach((route) => {
      useMenuStore.getState().addMenu(
        {
          key: route.element.props.name,
          label: route.element.props.label,
          icon: route.element.props.icon,
        },
        route.path
      );
    });

    return () => {
      filteredRoutes.forEach((route) => {
        useMenuStore.getState().removeMenu(route.props.name);
      });
    };
  });
}

const useRoutesAndResourcesFromChildren = (
  children: ReactNode
): RoutesAndResources => {
  const [routesAndResources] = useRoutesAndResourcesState(
    getRoutesAndResourceFromNodes(children)
  );

  return routesAndResources;
};

/*
 * A hook that store the routes and resources just like setState but also provides an additional function
 * to merge new routes and resources with the existing ones.
 */
const useRoutesAndResourcesState = (
  initialState: RoutesAndResources
): [
  RoutesAndResources,
  Dispatch<SetStateAction<RoutesAndResources>>,
  (newRoutesAndResources: RoutesAndResources) => void
] => {
  const [routesAndResources, setRoutesAndResources] = useState(initialState);

  const mergeRoutesAndResources = useCallback(
    (newRoutesAndResources: RoutesAndResources) => {
      setRoutesAndResources(
        (previous) =>
          ({
            customRoutesWithLayout: [
              ...previous.customRoutesWithLayout,
              newRoutesAndResources.customRoutesWithLayout,
            ],
            customRoutesWithoutLayout: [
              ...previous.customRoutesWithoutLayout,
              newRoutesAndResources.customRoutesWithoutLayout,
            ],
            resources: [...previous.resources, newRoutesAndResources.resources],
            components: [
              ...previous.components,
              newRoutesAndResources.components,
            ],
          } as RoutesAndResources)
      );
    },
    []
  );

  return [routesAndResources, setRoutesAndResources, mergeRoutesAndResources];
};

/**
 * Inspect the children and return an object with the following keys:
 * - customRoutesWithLayout: an array of the custom routes to render inside the layout
 * - customRoutesWithoutLayout: an array of custom routes to render outside the layout
 * - resources: an array of resources elements
 */
const getRoutesAndResourceFromNodes = (
  children: ReactNode,
  path: TushanCategoryPathInfo[] = []
): RoutesAndResources => {
  const customRoutesWithLayout: RoutesAndResources['customRoutesWithLayout'] =
    [];
  const customRoutesWithoutLayout: RoutesAndResources['customRoutesWithoutLayout'] =
    [];
  const resources: RoutesAndResources['resources'] = [];
  const components: RoutesAndResources['components'] = [];

  Children.forEach(children, (element) => {
    if (!React.isValidElement(element)) {
      // Ignore non-elements. This allows people to more easily inline
      // conditionals in their route config.
      return;
    }

    // Fragment
    if (element.type === Fragment) {
      const routesFromFragment = getRoutesAndResourceFromNodes(
        element.props.children,
        path
      );
      customRoutesWithLayout.push(...routesFromFragment.customRoutesWithLayout);
      customRoutesWithoutLayout.push(
        ...routesFromFragment.customRoutesWithoutLayout
      );
      resources.push(...routesFromFragment.resources);
      components.push(...routesFromFragment.components);
    }

    // Category
    if (element.type === Category) {
      const categoryElement = element as ReactElement<CategoryProps>;
      const { children, ...currPathInfo } = categoryElement.props;

      const routesFromCategory = getRoutesAndResourceFromNodes(children, [
        ...path,
        currPathInfo,
      ]);

      customRoutesWithLayout.push(...routesFromCategory.customRoutesWithLayout);
      customRoutesWithoutLayout.push(
        ...routesFromCategory.customRoutesWithoutLayout
      );
      resources.push(...routesFromCategory.resources);
      components.push(...routesFromCategory.components);
    }

    // CustomRoute
    if (element.type === CustomRoute) {
      const customRouteElement = element as ReactElement<CustomRoutesProp>;

      if (customRouteElement.props.noLayout) {
        customRoutesWithoutLayout.push(customRouteElement);
      } else {
        customRoutesWithLayout.push({ path, element: customRouteElement });
      }
    }

    if (element.type === Resource) {
      resources.push({ path, element: element as ReactElement<ResourceProps> });
    }

    // Fallback
    components.push(element);
  });

  return {
    customRoutesWithLayout,
    customRoutesWithoutLayout,
    resources,
    components,
  };
};

type RoutesAndResources = {
  customRoutesWithLayout: {
    path: TushanCategoryPathInfo[];
    element: ReactElement<CustomRoutesProp>;
  }[];
  customRoutesWithoutLayout: ReactElement<CustomRoutesProp>[];
  resources: {
    path: TushanCategoryPathInfo[];
    element: ReactElement<ResourceProps>;
  }[];
  components: ReactElement[];
};

type AdminRouterStatus = 'loading' | 'empty' | 'ready';
