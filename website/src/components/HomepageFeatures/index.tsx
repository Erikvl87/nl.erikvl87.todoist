import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Task Automation',
    description: (
      <>
        Create tasks, set due dates, assign priorities, and complete tasks automatically 
        using Homey flows. Triggered by motion, time, or any other event.
      </>
    ),
  },
  {
    title: 'Real-Time Events',
    description: (
      <>
        React to task completions and other Todoist events in real time. Build 
        flows that respond the moment a task is checked off.
      </>
    ),
  },
  {
    title: 'Dashboard Widget',
    description: (
      <>
        Display your Todoist project tasks directly on your Homey dashboard with a 
        live-updating widget that supports task completion.
      </>
    ),
  },
];

function Feature({title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
