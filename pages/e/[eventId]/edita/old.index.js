import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { slug, getFormattedDate } from "@utils/helpers";
import {
  DatePicker,
  Input,
  Select,
  TextArea,
  ImageUpload,
} from "@components/ui/common/form";
import Meta from "@components/partials/seo-meta";
import { Notification } from "@components/ui/common";
import { generateRegionsOptions, generateTownsOptions } from "@utils/helpers";
import { siteUrl } from "@config/index";

const _createFormState = (
  isDisabled = true,
  isPristine = true,
  message = ""
) => ({
  isDisabled,
  isPristine,
  message,
});

const defaultForm = {
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  region: "",
  town: "",
  location: "",
  imageUploaded: null,
  eventUrl: "",
};

const createFormState = (
  { title, description, startDate, endDate, region, town, location, eventUrl },
  isPristine
) => {
  if (!isPristine) {
    return _createFormState(true, true, "");
  }

  if (!title || title.length < 10) {
    return _createFormState(true, true, "Títol obligatori, mínim 10 caràcters");
  }

  if (!description.replace(/(<([^>]+)>)/gi, "") || description.length < 15) {
    return _createFormState(
      true,
      true,
      "Descripció obligatòria, mínim 15 caràcters"
    );
  }

  if (!region || !region.value) {
    return _createFormState(true, true, "Comarca obligatoria");
  }

  if (!town || !town.value) {
    return _createFormState(true, true, "Ciutat obligatoria");
  }

  if (!location) {
    return _createFormState(true, true, "Lloc obligatori");
  }

  const normalizedStartDate =
    typeof startDate === "string" ? new Date(startDate) : startDate;
  const normalizedEndDate =
    typeof endDate === "string" ? new Date(endDate) : endDate;

  if (!normalizedStartDate) {
    return _createFormState(true, true, "Data inici obligatòria");
  }

  if (!normalizedEndDate) {
    return _createFormState(true, true, "Data final obligatòria");
  }

  if (normalizedEndDate.getTime() <= normalizedStartDate.getTime()) {
    return _createFormState(
      true,
      true,
      "Data final no pot ser anterior o igual a la data inici"
    );
  }

  const urlPattern = new RegExp(
    "^(https:\\/\\/)" + // strictly require https protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|" + // domain name
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
      "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
      "(\\#[-a-z\\d_]*)?$",
    "i"
  );

  if (eventUrl && !urlPattern.test(eventUrl)) {
    return _createFormState(
      true,
      true,
      "Enllaç no vàlid, ha de començar amb https"
    );
  }

  return _createFormState(false);
};

export default function Edita({ event }) {
  const router = useRouter();
  const [form, setForm] = useState(defaultForm);
  const [region, setRegion] = useState(event.region.value);
  const [formState, setFormState] = useState(_createFormState());
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [showDeleteMessage, setShowDeleteMessage] = useState(false);
  const [imageToUpload, setImageToUpload] = useState(null);
  const [progress, setProgress] = useState(0);

  const regionsArray = useMemo(() => generateRegionsOptions(), []);
  const citiesArray = useMemo(() => generateTownsOptions(region), [region]);

  useEffect(() => {
    setForm(event);
  }, [event]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, [showDeleteMessage]);

  const goToEventPage = (url) => ({
    pathname: `${url}`,
    query: { edit_suggested: true },
  });

  const handleFormChange = (name, value) => {
    const newForm = { ...form, [name]: value };

    setForm(newForm);
    setFormState(createFormState(newForm));
  };

  const handleChange = ({ target: { name, value } }) =>
    handleFormChange(name, value);

  const handleRegionChange = (region) => {
    setRegion(region.value);
    handleFormChange("region", region);
  };

  const handleTownChange = (town) => handleFormChange("town", town);

  const handleChangeDate = (name, value) => handleFormChange(name, value);

  const onSubmit = async () => {
    const newFormState = createFormState(form, formState.isPristine);

    setFormState(newFormState);

    if (!newFormState.isDisabled) {
      setIsLoadingEdit(true);

      try {
        const rawResponse = await fetch("/api/editEvent", {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...form,
            location: `${form.location}, ${form.town.label}, ${form.region.label}`,
            imageUploaded: !!imageToUpload || !!event.imageUploaded,
          }),
        });

        await rawResponse.json();

        const { formattedStart } = getFormattedDate(
          form.startDate,
          form.endDate
        );
        const slugifiedTitle = slug(form.title, formattedStart, form.id);

        if (imageToUpload) {
          uploadFile(form.id, slugifiedTitle);
        } else {
          router.push(goToEventPage(`/e/${slugifiedTitle}`));
        }
      } catch (error) {
        console.error("Error updating event:", error);
        setIsLoadingEdit(false);
        setFormState(
          _createFormState(
            true,
            true,
            "Hi ha hagut un error, torna-ho a provar més tard o contacta amb nosaltres."
          )
        );
      }
    }
  };

  const uploadFile = (id, slugifiedTitle) => {
    const url = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUDNAME}/upload`;
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

    xhr.upload.addEventListener("progress", (e) => {
      setProgress(Math.round((e.loaded * 100.0) / e.total));
    });

    xhr.onreadystatechange = () => {
      if (xhr.readyState == 4 && xhr.status == 200) {
        router.push(goToEventPage(`/e/${slugifiedTitle}`));
      }
    };

    fd.append(
      "upload_preset",
      process.env.NEXT_PUBLIC_CLOUDINARY_UNSIGNED_UPLOAD_PRESET
    );
    fd.append("tags", "browser_upload");
    fd.append("file", imageToUpload);
    fd.append("public_id", id);
    xhr.send(fd);
  };

  return (
    <>
      <Meta
        title="Edita - Esdeveniments.cat"
        description="Edita - Esdeveniments.cat"
        canonical={`${siteUrl}/e/${event.slug}/edita`}
      />
      {showDeleteMessage && (
        <Notification
          customNotification={false}
          hideNotification={setShowDeleteMessage}
          title="Estem revisant la teva sol·licitud. Si en menys de 24 hores no ha estat eliminat. Si us plau, posa't en contacte amb nosaltres a:"
          url="hola@esdeveniments.cat"
        />
      )}
      <div className="w-full p-4 sm:w-[576px] md:w-[760px] lg:w-[760px]">
        <div className="flex flex-col justify-center gap-4">
          <div className="flex flex-col justify-center gap-4">
            <h3 className="font-semibold">Editar</h3>
            <h3>{form.title || event.title}</h3>
            <p>* camps obligatoris</p>
          </div>
          <div className="flex flex-col justify-center gap-4">
            <Input
              id="title"
              title="Títol *"
              value={form.title || event.title}
              onChange={handleChange}
            />

            <TextArea
              id="description"
              value={form.description || event.description}
              onChange={handleChange}
            />

            {event.eventUrl && (
              <Input
                id="eventUrl"
                title="Enllaç de l'esdeveniment"
                value={form.eventUrl || event.eventUrl}
                onChange={handleChange}
              />
            )}

            {event.imageUploaded ? (
              <div className="sm:col-span-6">
                <div className="next-image-wrapper">
                  <Image
                    alt={form.title || event.title}
                    title={form.title || event.title}
                    height="100"
                    width="150"
                    className="object-contain rounded-lg"
                    src={form.imageUploaded || event.imageUploaded}
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  * Si voleu canviar la imatge, poseu-vos en contacte amb
                  nosaltres. Estem treballant perquè es pugui fer des del
                  formulari.
                </p>
              </div>
            ) : (
              <ImageUpload
                value={imageToUpload}
                onUpload={setImageToUpload}
                progress={progress}
              />
            )}

            <Select
              id="region"
              title="Comarca *"
              options={regionsArray}
              value={form.region}
              onChange={handleRegionChange}
              isClearable
              placeholder="una comarca"
            />

            <Select
              id="town"
              title="Ciutat *"
              options={citiesArray}
              value={form.town}
              onChange={handleTownChange}
              isDisabled={!form.region}
              isClearable
              placeholder="un poble"
            />

            <Input
              id="location"
              title="Lloc *"
              value={form.location}
              onChange={handleChange}
            />

            <DatePicker
              startDate={form.startDate || event.startDate}
              endDate={form.endDate || event.endDate}
              onChange={handleChangeDate}
            />

            <Input
              id="email"
              title="Correu electrònic"
              subtitle="Vols que t'avisem quan l'esdeveniment s'hagi actualitzat? (no guardem les dades)"
              onChange={handleChange}
            />
          </div>
        </div>
      </div>
      {formState.isPristine && formState.message && (
        <div className="p-4 my-3 text-red-700 bg-red-200 rounded-xl text-sm">
          {formState.message}
        </div>
      )}
      <div className="p-4">
        <div className="flex justify-center">
          <button
            disabled={isLoadingEdit}
            onClick={onSubmit}
            className="flex justify-center items-center gap-2 text-blackCorp bg-whiteCorp rounded-xl py-2 px-3 ease-in-out duration-300 border border-darkCorp font-barlow italic uppercase font-semibold tracking-wide focus:outline-none hover:bg-primary hover:border-whiteCorp hover:text-whiteCorp"
          >
            {isLoadingEdit ? (
              <>
                <svg
                  role="status"
                  className="inline w-4 h-4 mr-2 text-gray-200 animate-spin dark:text-gray-600"
                  viewBox="0 0 100 101"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                    fill="#FFFFFF"
                  />
                  <path
                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                    fill="#FFFFFF"
                  />
                </svg>
                Desant...
              </>
            ) : (
              "Desar"
            )}
          </button>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps({ params }) {
  const { getCalendarEvent } = require("@lib/helpers");
  const {
    getRegionValueByLabel,
    getTownValueByLabel,
  } = require("@utils/helpers");
  const eventId = params.eventId;

  const { event } = await getCalendarEvent(eventId);

  if (!event.id) {
    return {
      notFound: true,
    };
  }

  event.region = {
    value: getRegionValueByLabel(event.region),
    label: event.region,
  };
  event.town = {
    value: getTownValueByLabel(event.town),
    label: event.town,
  };

  return {
    props: { event },
  };
}
