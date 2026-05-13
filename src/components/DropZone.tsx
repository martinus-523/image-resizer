import { useCallback, useRef, useState } from "react";

interface Props {
  onFile: (file: File) => void;
}

export function DropZone({ onFile }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      onFile(files[0]);
    },
    [onFile],
  );

  return (
    <div
      className={`dropzone ${dragging ? "dragging" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="dropzone-inner">
        <div className="dropzone-icon" aria-hidden>+</div>
        <p className="dropzone-title">Tap or drop an image</p>
        <p className="dropzone-sub">JPEG · PNG · WebP · HEIC</p>
      </div>
    </div>
  );
}
