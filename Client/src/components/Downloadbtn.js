import React from "react";

const Downloadbtn = ({ code, language }) => {
  const downloadcode = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    switch (language) {
      case "javascript":
        a.download = "code.js";
        break;
      case "python":
        a.download = "code.py";
        break;
      case "text/x-csrc":
        a.download = "code.c";
        break;
      case "text/x-c++src":
        a.download = "code.cpp";
        break;
      case "text/typescript":
        a.download = "code.ts";
        break;
      default:
        a.download = "code.txt";
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={downloadcode}
      className="bg-blue-500 text-white rounded py-2 px-6 shadow-md hover:bg-blue-600 hover:shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1"
    >
      Save
    </button>
  );
};

export default Downloadbtn;
