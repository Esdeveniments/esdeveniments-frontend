import { Editor } from "@tinymce/tinymce-react";
import { ChangeEvent } from "react";

interface TextAreaProps {
  id: string;
  value: string;
  // eslint-disable-next-line no-unused-vars
  onChange: (e: ChangeEvent<{ name: string; value: string }>) => void;
}

export default function TextArea({ id, value, onChange }: TextAreaProps) {
  const handleEditorChange = (content: string) => {
    onChange({ target: { name: id, value: content } } as ChangeEvent<{
      name: string;
      value: string;
    }>);
  };

  return (
    <div className="w-full">
      <label htmlFor={id} className="text-blackCorp font-bold">
        Descripció *
      </label>
      <div className="mt-2">
        <Editor
          id={id}
          value={value}
          apiKey={process.env.NEXT_PUBLIC_TINY}
          init={{
            language: "ca",
            height: 300,
            menubar: false,
            plugins: [
              "advlist autolink lists link image charmap print preview anchor",
              "searchreplace visualblocks code fullscreen",
              "insertdatetime media table paste code help wordcount",
            ],
            toolbar:
              "undo redo | formatselect | bold italic backcolor | \
              alignleft aligncenter alignright alignjustify | \
              bullist numlist outdent indent | removeformat | help",
          }}
          onEditorChange={handleEditorChange}
        />
      </div>
    </div>
  );
}
