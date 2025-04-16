import { useRef, memo, FC } from "react";
import dynamic from "next/dynamic";
import Filters from "@components/ui/filters";
import useOnScreen from "@components/hooks/useOnScreen";
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

  const filtersModalRef = useRef<HTMLDivElement>(null);
  const isFiltersModalVisible = useOnScreen(filtersModalRef, {
    freezeOnceVisible: true,
  });

  return (
    <>
      {openModal && (
        <div
          className="flex justify-center items-center gap-4"
          ref={filtersModalRef}
        >
          {isFiltersModalVisible && <FiltersModal />}
        </div>
      )}
      <Filters placeLabel={placeLabel} />
    </>
  );
};

export default memo(SubMenu);
