import React, { useEffect, useRef, useState } from 'react';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import Delimiter from '@editorjs/delimiter';
import Alert from 'editorjs-alert';
import List from "@editorjs/list";
import NestedList from '@editorjs/nested-list';
import Checklist from '@editorjs/checklist';
import Embed from '@editorjs/embed';
import SimpleImage from 'simple-image-editorjs';
import Table from '@editorjs/table';
import CodeTool from '@editorjs/code';
import { TextVariantTune } from '@editorjs/text-variant-tune';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebaseConfig';
import { useUser } from '@clerk/nextjs';
import Paragraph from '@editorjs/paragraph';
import GenerateAITemplate from './GenerateAITemplate';

function RichDocumentEditor({ params }) {
  const ref = useRef();
  const { user } = useUser();
  const [isFetched, setIsFetched] = useState(false);
  const [editor, setEditor] = useState(null);

  useEffect(() => {
    if (user) {
      InitEditor();
    }
  }, [user]);

  const SaveDocument = () => {
    if (ref.current) {
      ref.current.save().then(async (outputData) => {
        const docRef = doc(db, 'documentOutput', params?.documentid);

        await updateDoc(docRef, {
          output: JSON.stringify(outputData),
          editedBy: user?.primaryEmailAddress?.emailAddress,
        });
      });
    }
  };

  const GetDocumentOutput = () => {
    const unsubscribe = onSnapshot(doc(db, 'documentOutput', params?.documentid), (doc) => {
      if (doc.data()?.editedBy !== user?.primaryEmailAddress?.emailAddress || !isFetched) {
        try {
          const output = JSON.parse(doc.data()?.output || '{}');
          doc.data().editedBy && editor?.render(output);
          setIsFetched(true);
        } catch (error) {
          console.error("Failed to parse document output:", error);
        }
      }
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  };

  const InitEditor = () => {
    if (!editor) {
      const editorInstance = new EditorJS({
        onChange: () => {
          SaveDocument();
        },
        onReady: () => {
          GetDocumentOutput();
        },
        holder: 'editorjs',
        tools: {
          header: Header,
          delimiter: Delimiter,
          paragraph: Paragraph,
          alert: {
            class: Alert,
            inlineToolbar: true,
            shortcut: 'CMD+SHIFT+A',
            config: {
              alertTypes: ['primary', 'secondary', 'info', 'success', 'warning', 'danger', 'light', 'dark'],
              defaultType: 'primary',
              messagePlaceholder: 'Enter something',
            },
          },
          table: Table,
          list: {
            class: List,
            inlineToolbar: true,
            shortcut: 'CMD+SHIFT+L',
            config: {
              defaultStyle: 'unordered',
            },
          },
          checklist: {
            class: Checklist,
            shortcut: 'CMD+SHIFT+C',
            inlineToolbar: true,
          },
          image: SimpleImage,
          code: {
            class: CodeTool,
            shortcut: 'CMD+SHIFT+P',
          },
        },
      });

      ref.current = editorInstance;
      setEditor(editorInstance);
    }
  };

  return (
    <div className=' '>
      <div id='editorjs' className='w-[70%]'></div>
      <div className='fixed bottom-10 md:ml-80 left-0 z-10'>
        <GenerateAITemplate setGenerateAIOutput={(output) => editor?.render(output)} />
      </div>
    </div>
  );
}

export default RichDocumentEditor;
