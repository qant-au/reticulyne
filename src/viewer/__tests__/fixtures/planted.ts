// A file that breaks the viewer's import rule, to prove the check sees it.
import { useState } from 'react';
import { useModelStore } from 'src/stores/modelStore';

export const planted = [useState, useModelStore];
