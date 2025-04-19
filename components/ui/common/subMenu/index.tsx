import { memo, FC } from "react";
import dynamic from "next/dynamic";
import Filters from "@components/ui/filters";
import useStore from "@store";

interface SubMenuProps {
  placeLabel: string;
}

const FiltersModal = dynamic(() => import("@components/ui/filtersModal"), {
  loading: () => null,
});

const SubMenu: FC<SubMenuProps> = ({ placeLabel }) => {
  const {
    openModal,
    place,
    byDate,
    category,
    distance,
    userLocation,
    setState,
  } = useStore((state) => ({
    openModal: state.openModal,
    place: state.place,
    byDate: state.byDate,
    category: state.category,
    distance: state.distance,
    userLocation: state.userLocation,
    setState: state.setState,
  }));

  return (
    <>
      {openModal && (
        <FiltersModal
          openModal={openModal}
          place={place}
          byDate={byDate}
          category={category}
          distance={distance}
          userLocation={userLocation}
          setState={setState}
        />
      )}
      <Filters placeLabel={placeLabel} />
    </>
  );
};

export default memo(SubMenu);
