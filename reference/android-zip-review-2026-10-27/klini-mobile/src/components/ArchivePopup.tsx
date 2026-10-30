import React, { ComponentProps } from 'react';
import Popup from './TeleconsultPopup';

export default function ArchivePopup(props: Omit<ComponentProps<typeof Popup>, 'variant'>) {
  return <Popup {...props} variant="archive" />;
}
