import { memo, FC } from "react";
import dynamic from "next/dynamic";
import Filters from "@components/ui/filters";
import useStore from "@store";

interface StoreState {
  openModal: boolean;
}

interface SubMenuProps {
  placeLabel: string;
}

const FiltersModal = dynamic(() => import("@components/ui/filtersModal"), {
  loading: () => null,
});

const SubMenu: FC<SubMenuProps> = ({ placeLabel }) => {
  const { openModal } = useStore((state: StoreState) => ({
    openModal: state.openModal,
  }));

  return (
    <>
      {openModal && <FiltersModal />}
      <Filters placeLabel={placeLabel} />
    </>
  );
};

export default memo(SubMenu);
