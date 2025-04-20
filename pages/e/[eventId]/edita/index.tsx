import React, { useState, useEffect, useMemo } from "react";
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
import { siteUrl } from "@config/index";
import type {
  CitySummaryResponseDTO,
  EventDetailResponseDTO,
  RegionSummaryResponseDTO,
} from "types/api/event";
import { updateEventById } from "lib/api/events";
import { useGetRegionsWithCities } from "@components/hooks/useGetRegionsWithCities";
import type { FormState, FormData } from "types/event";
import type { Option } from "types/common";
import type { EventUpdateRequestDTO } from "types/api/event";
import type { EventTimeDTO } from "types/api/event";

// Helper type guards for Option/DTO
function isOption(obj: unknown): obj is Option {
  return !!obj && typeof obj === "object" && "value" in obj && "label" in obj;
}

function getRegionId(region: FormData["region"]): string | null {
  if (!region) return null;
  if ("id" in region) return String(region.id);
  if (isOption(region)) return region.value;
  return null;
}

function getTownId(town: FormData["town"]): string | null {
  if (!town) return null;
  if ("id" in town) return String(town.id);
  if (isOption(town)) return town.value;
  return null;
}

// --- Helper: Type guard for backend time object ---
function isBackendTime(obj: unknown): obj is EventTimeDTO {
  return (
    !!obj &&
    typeof obj === "object" &&
    typeof (obj as EventTimeDTO).hour === "number" &&
    typeof (obj as EventTimeDTO).minute === "number"
  );
}

const _createFormState = (
  isDisabled = true,
  isPristine = true,
  message = ""
): FormState => ({
  isDisabled,
  isPristine,
  message,
});

const createFormState = (
  form: Pick<
    FormData,
    | "title"
    | "description"
    | "startDate"
    | "endDate"
    | "region"
    | "town"
    | "location"
    | "url"
  >,
  isPristine: boolean
): FormState => {
  const {
    title,
    description,
    startDate,
    endDate,
    region,
    town,
    location,
    url,
  } = form;
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

  if (!region || !getRegionId(region)) {
    return _createFormState(true, true, "Comarca obligatoria");
  }

  if (!town || !getTownId(town)) {
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

  if (url && !urlPattern.test(url)) {
    return _createFormState(
      true,
      true,
      "Enllaç no vàlid, ha de començar amb https"
    );
  }

  return _createFormState(false);
};

// --- Mapping function: EventDetailResponseDTO to FormData ---
function eventDtoToFormData(event: EventDetailResponseDTO): FormData {
  return {
    id: event.id ? String(event.id) : undefined,
    slug: event.slug || "",
    title: event.title || "",
    description: event.description || "",
    type: event.type || "FREE",
    startDate: event.startDate ? new Date(event.startDate) : "",
    startTime: isBackendTime(event.startTime)
      ? `${event.startTime.hour
          .toString()
          .padStart(2, "0")}:${event.startTime.minute
          .toString()
          .padStart(2, "0")}`
      : "",
    endDate: event.endDate ? new Date(event.endDate) : "",
    endTime: isBackendTime(event.endTime)
      ? `${event.endTime.hour
          .toString()
          .padStart(2, "0")}:${event.endTime.minute
          .toString()
          .padStart(2, "0")}`
      : "",
    region: event.region
      ? { value: String(event.region.id), label: event.region.name }
      : null,
    town: event.city
      ? { value: String(event.city.id), label: event.city.name }
      : null,
    location: event.location || "",
    imageUrl: event.imageUrl || null,
    url: event.url || "",
    categories: Array.isArray(event.categories)
      ? event.categories.map((cat) => ({ id: cat.id, name: cat.name }))
      : [],
    email: "", // UI only
  };
}

// --- Helper: Parse time to { hour, minute, second, nano } ---
function parseTime(dateOrString: Date | string | undefined): EventTimeDTO {
  let date: Date;
  if (!dateOrString) {
    return { hour: 0, minute: 0, second: 0, nano: 0 };
  }
  if (typeof dateOrString === "string") {
    const [h, m, s] = dateOrString.split(":").map(Number);
    date = new Date(1970, 0, 1, h || 0, m || 0, s || 0);
    if (isNaN(date.getTime())) {
      return { hour: 0, minute: 0, second: 0, nano: 0 };
    }
  } else {
    date = dateOrString;
  }
  return {
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
    nano: 0,
  };
}

// --- Mapping: FormData to backend DTO ---
function formDataToBackendDTO(form: FormData): EventUpdateRequestDTO {
  return {
    title: form.title,
    type: form.type ?? "FREE",
    url: form.url,
    description: form.description,
    imageUrl: form.imageUrl,
    regionId:
      form.region && "id" in form.region
        ? form.region.id
        : isOption(form.region)
        ? Number(form.region.value)
        : 0,
    cityId:
      form.town && "id" in form.town
        ? form.town.id
        : isOption(form.town)
        ? Number(form.town.value)
        : 0,
    startDate:
      typeof form.startDate === "string"
        ? form.startDate
        : form.startDate instanceof Date
        ? form.startDate.toISOString().slice(0, 10)
        : "",
    startTime: parseTime(form.startTime),
    endDate:
      typeof form.endDate === "string"
        ? form.endDate
        : form.endDate instanceof Date
        ? form.endDate.toISOString().slice(0, 10)
        : "",
    endTime: parseTime(form.endTime),
    location: form.location,
    categories: Array.isArray(form.categories)
      ? form.categories.map((cat) =>
          typeof cat === "object" && "id" in cat
            ? cat.id
            : isOption(cat)
            ? Number(cat.value)
            : Number(cat)
        )
      : [],
  };
}

const Edita: React.FC<{ event: FormData }> = ({ event }) => {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({ ...event });
  const [formState, setFormState] = useState<FormState>(_createFormState());
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [showDeleteMessage, setShowDeleteMessage] = useState(false);
  const [imageToUpload, setImageToUpload] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);

  const { regionsWithCities, isLoading: isLoadingRegionsWithCities } =
    useGetRegionsWithCities();

  const regionOptions = useMemo(
    () =>
      regionsWithCities
        ? regionsWithCities.map((region) => ({
            label: region.name,
            value: region.id.toString(),
          }))
        : [],
    [regionsWithCities]
  );

  const cityOptions = useMemo(() => {
    if (!regionsWithCities || !form.region) return [];
    const region = regionsWithCities.find(
      (r) => String(r.id) === getRegionId(form.region)
    );
    return region ? region.cities : [];
  }, [regionsWithCities, form.region]);

  useEffect(() => {
    setForm({ ...event });
  }, [event]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, [showDeleteMessage]);

  const goToEventPage = (url: string) => ({
    pathname: `${url}`,
    query: { edit_suggested: true },
  });

  // --- Field-specific change handlers ---
  const handleTitleChange = (v: string) => setForm((f) => ({ ...f, title: v }));
  const handleDescriptionChange = (v: string) =>
    setForm((f) => ({ ...f, description: v }));
  const handleUrlChange = (v: string) => setForm((f) => ({ ...f, url: v }));
  const handleLocationChange = (v: string) =>
    setForm((f) => ({ ...f, location: v }));
  const handleEmailChange = (v: string) => setForm((f) => ({ ...f, email: v }));

  const handleRegionChange = (
    region: RegionSummaryResponseDTO | { value: string; label: string } | null
  ) => {
    setForm((f) => ({ ...f, region, town: null }));
  };

  const handleTownChange = (
    town: CitySummaryResponseDTO | { value: string; label: string } | null
  ) => {
    setForm((f) => ({ ...f, town }));
  };

  const handleStartDateChange = (date: string | Date) =>
    setForm((f) => ({ ...f, startDate: date }));
  const handleEndDateChange = (date: string | Date) =>
    setForm((f) => ({ ...f, endDate: date }));

  const onSubmit = async () => {
    const newFormState = createFormState(form, formState.isPristine);
    setFormState(newFormState);
    if (!newFormState.isDisabled) {
      setIsLoadingEdit(true);
      try {
        if (!event.id) throw new Error("Event id is missing");

        const dataToSend = formDataToBackendDTO(form);
        await updateEventById(event.id, dataToSend);
        const { formattedStart } = getFormattedDate(
          typeof form.startDate === "string"
            ? form.startDate
            : form.startDate.toISOString().slice(0, 10),
          typeof form.endDate === "string"
            ? form.endDate
            : form.endDate.toISOString().slice(0, 10)
        );
        const slugifiedTitle = slug(form.title, formattedStart, event.id);
        if (imageToUpload) {
          uploadFile(event.id, slugifiedTitle);
        } else {
          setProgress(0);
          router.push(`/e/${event.id}/${slugifiedTitle}`);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoadingEdit(false);
      }
    }
  };

  const uploadFile = (id: string, slugifiedTitle: string) => {
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

    if (process.env.NEXT_PUBLIC_CLOUDINARY_UNSIGNED_UPLOAD_PRESET) {
      fd.append(
        "upload_preset",
        process.env.NEXT_PUBLIC_CLOUDINARY_UNSIGNED_UPLOAD_PRESET
      );
    }
    fd.append("tags", "browser_upload");
    if (imageToUpload) {
      fd.append("file", imageToUpload);
    }
    if (id) {
      fd.append("public_id", id);
    }
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
              onChange={(e) => handleTitleChange(e.target.value)}
            />

            <TextArea
              id="description"
              value={form.description || event.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
            />

            <Input
              id="url"
              title="Enllaç de l'esdeveniment"
              value={form.url || ""}
              onChange={(e) => handleUrlChange(e.target.value)}
            />

            {event.imageUrl ? (
              <div className="sm:col-span-6">
                <div className="next-image-wrapper">
                  <Image
                    alt={form.title || event.title}
                    title={form.title || event.title}
                    height="100"
                    width="150"
                    className="object-contain rounded-lg"
                    src={form.imageUrl || event.imageUrl}
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
                value={form.imageUrl}
                onUpload={setImageToUpload}
                progress={progress}
              />
            )}

            <Select
              id="region"
              title="Comarca *"
              options={regionOptions}
              value={isOption(form.region) ? form.region : null}
              onChange={(option: Option | null) => handleRegionChange(option)}
              isClearable
              placeholder={
                isLoadingRegionsWithCities
                  ? "Carregant comarques..."
                  : "Selecciona una comarca"
              }
            />

            <Select
              id="town"
              title="Ciutat *"
              options={cityOptions}
              value={isOption(form.town) ? form.town : null}
              onChange={(option: Option | null) => handleTownChange(option)}
              isDisabled={!form.region || isLoadingRegionsWithCities}
              isClearable
              placeholder={
                isLoadingRegionsWithCities
                  ? "Carregant pobles..."
                  : "Selecciona un poble"
              }
            />

            <Input
              id="location"
              title="Lloc *"
              value={form.location}
              onChange={(e) => handleLocationChange(e.target.value)}
            />

            <DatePicker
              startDate={form.startDate ? new Date(form.startDate) : new Date()}
              endDate={form.endDate ? new Date(form.endDate) : new Date()}
              onChange={(name: string, value: Date) => {
                if (name === "startDate") {
                  handleStartDateChange(value);
                } else if (name === "endDate") {
                  handleEndDateChange(value);
                }
              }}
            />

            <Input
              id="email"
              title="Correu electrònic"
              subtitle="Vols que t'avisem quan l'esdeveniment s'hagi actualitzat? (no guardem les dades)"
              value={form.email || ""}
              onChange={(e) => handleEmailChange(e.target.value)}
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
};

export async function getServerSideProps({
  params,
}: {
  params: { eventId: string };
}) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/events/${params.eventId}`
    );
    const event: EventDetailResponseDTO = await res.json();
    if (!event) {
      return { notFound: true };
    }
    const formData = eventDtoToFormData(event);
    return { props: { event: formData } };
  } catch (error) {
    console.error(error);
    return { notFound: true };
  }
}

export default Edita;
